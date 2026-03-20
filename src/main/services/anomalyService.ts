import { getDatabase } from './database';
import type { IPMACBinding, IPMACChange, ChangeStats, ChangeType, ExcludedIP, CreateExcludedIPInput } from '../../shared/types/anomaly';

/**
 * 异常检测服务
 */
export class AnomalyService {
  /**
   * 检查 IP 是否被排除
   */
  private static isIPExcluded(ip: string): boolean {
    const db = getDatabase();
    const excluded = db.prepare(`SELECT ip_or_cidr FROM excluded_ips`).all() as Array<{ ip_or_cidr: string }>;

    for (const rule of excluded) {
      const pattern = rule.ip_or_cidr;

      // 检查是否是 CIDR 格式（如 192.168.1.0/24）
      if (pattern.includes('/')) {
        if (this.ipInCIDR(ip, pattern)) {
          return true;
        }
      }
      // 检查是否是通配符格式（如 192.168.1.*）
      else if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        if (regex.test(ip)) {
          return true;
        }
      }
      // 精确匹配
      else if (pattern === ip) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查 IP 是否在 CIDR 范围内
   */
  private static ipInCIDR(ip: string, cidr: string): boolean {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);
    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;

    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * IP 地址转数字
   */
  private static ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * 处理 ARP 采集结果，更新绑定并检测变化
   */
  static processARPEntries(entries: Array<{ ip: string; mac: string }>): IPMACChange[] {
    const db = getDatabase();
    const changes: IPMACChange[] = [];
    const now = new Date().toISOString();

    for (const entry of entries) {
      const { ip, mac } = entry;

      // 跳过被排除的 IP
      if (this.isIPExcluded(ip)) {
        continue;
      }

      // 查询当前活跃的绑定
      const currentBinding = db.prepare(`
        SELECT id, mac FROM ip_mac_bindings
        WHERE ip = ? AND is_active = 1
      `).get(ip) as { id: number; mac: string } | undefined;

      if (currentBinding) {
        if (currentBinding.mac !== mac) {
          // MAC 地址变化
          const change = this.recordChange(ip, currentBinding.mac, mac, 'mac_changed');
          if (change) changes.push(change);

          // 标记旧绑定为非活跃
          db.prepare(`UPDATE ip_mac_bindings SET is_active = 0 WHERE id = ?`).run(currentBinding.id);

          // 创建新绑定
          this.createBinding(ip, mac, now);
        } else {
          // 更新最后看到时间
          db.prepare(`
            UPDATE ip_mac_bindings SET last_seen = ? WHERE id = ?
          `).run(now, currentBinding.id);
        }
      } else {
        // 检查是否是新 IP 还是 IP 被重新使用
        const oldBinding = db.prepare(`
          SELECT mac FROM ip_mac_bindings WHERE ip = ? ORDER BY last_seen DESC LIMIT 1
        `).get(ip) as { mac: string } | undefined;

        if (oldBinding) {
          // IP 被重新使用
          const change = this.recordChange(ip, null, mac, 'ip_reused');
          if (change) changes.push(change);
        }

        // 创建新绑定
        this.createBinding(ip, mac, now);
      }
    }

    return changes;
  }

  /**
   * 创建 IP-MAC 绑定
   */
  private static createBinding(ip: string, mac: string, now: string): void {
    const db = getDatabase();

    try {
      db.prepare(`
        INSERT INTO ip_mac_bindings (ip, mac, first_seen, last_seen, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(ip, mac, now, now);
    } catch (e) {
      // 忽略重复错误，更新 last_seen
      db.prepare(`
        UPDATE ip_mac_bindings SET last_seen = ?, is_active = 1
        WHERE ip = ? AND mac = ?
      `).run(now, ip, mac);
    }
  }

  /**
   * 记录变化事件
   */
  private static recordChange(
    ip: string,
    oldMac: string | null,
    newMac: string | null,
    changeType: ChangeType
  ): IPMACChange | null {
    const db = getDatabase();

    try {
      const result = db.prepare(`
        INSERT INTO ip_mac_changes (ip, old_mac, new_mac, change_type, detected_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(ip, oldMac, newMac, changeType);

      return {
        id: result.lastInsertRowid as number,
        ip,
        oldMac,
        newMac,
        changeType,
        detectedAt: new Date().toISOString(),
        acknowledged: false,
        acknowledgedAt: null,
        notes: null,
      };
    } catch (e) {
      console.error('[Anomaly] Failed to record change:', e);
      return null;
    }
  }

  /**
   * 获取变化事件列表
   */
  static getChanges(
    unacknowledgedOnly: boolean = false,
    limit: number = 100
  ): IPMACChange[] {
    const db = getDatabase();

    let query = `
      SELECT
        id, ip, old_mac as oldMac, new_mac as newMac,
        change_type as changeType, detected_at as detectedAt,
        acknowledged, acknowledged_at as acknowledgedAt, notes
      FROM ip_mac_changes
    `;

    if (unacknowledgedOnly) {
      query += ' WHERE acknowledged = 0';
    }

    query += ' ORDER BY detected_at DESC LIMIT ?';

    const rows = db.prepare(query).all(limit) as any[];

    return rows.map(row => ({
      ...row,
      acknowledged: row.acknowledged === 1,
      acknowledgedAt: row.acknowledgedAt,
    }));
  }

  /**
   * 确认变化事件
   */
  static acknowledgeChange(id: number, notes?: string): void {
    const db = getDatabase();

    db.prepare(`
      UPDATE ip_mac_changes
      SET acknowledged = 1, acknowledged_at = datetime('now'), notes = ?
      WHERE id = ?
    `).run(notes || null, id);
  }

  /**
   * 批量确认变化事件
   */
  static acknowledgeAll(): number {
    const db = getDatabase();

    const result = db.prepare(`
      UPDATE ip_mac_changes
      SET acknowledged = 1, acknowledged_at = datetime('now')
      WHERE acknowledged = 0
    `).run();

    return result.changes;
  }

  /**
   * 删除单个变化事件
   */
  static deleteChange(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM ip_mac_changes WHERE id = ?').run(id);
  }

  /**
   * 批量删除变化事件
   */
  static deleteChanges(ids: number[]): number {
    const db = getDatabase();

    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM ip_mac_changes WHERE id IN (${placeholders})`).run(...ids);

    return result.changes;
  }

  /**
   * 获取变化统计
   */
  static getStats(): ChangeStats {
    const db = getDatabase();

    const total = db.prepare(`SELECT COUNT(*) as count FROM ip_mac_changes`).get() as { count: number };
    const unacknowledged = db.prepare(`SELECT COUNT(*) as count FROM ip_mac_changes WHERE acknowledged = 0`).get() as { count: number };
    const macChanged = db.prepare(`SELECT COUNT(*) as count FROM ip_mac_changes WHERE change_type = 'mac_changed'`).get() as { count: number };
    const newIp = db.prepare(`SELECT COUNT(*) as count FROM ip_mac_changes WHERE change_type = 'new_ip'`).get() as { count: number };
    const ipReused = db.prepare(`SELECT COUNT(*) as count FROM ip_mac_changes WHERE change_type = 'ip_reused'`).get() as { count: number };

    return {
      total: total.count,
      unacknowledged: unacknowledged.count,
      macChanged: macChanged.count,
      newIp: newIp.count,
      ipReused: ipReused.count,
    };
  }

  /**
   * 获取 IP 绑定历史
   */
  static getBindingHistory(ip: string): IPMACBinding[] {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT
        id, ip, mac, first_seen as firstSeen, last_seen as lastSeen,
        is_active as isActive
      FROM ip_mac_bindings
      WHERE ip = ?
      ORDER BY last_seen DESC
    `).all(ip) as any[];

    return rows.map(row => ({
      ...row,
      isActive: row.isActive === 1,
    }));
  }

  // ============ 排除IP管理 ============

  /**
   * 获取所有排除规则
   */
  static getExcludedIPs(): ExcludedIP[] {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, ip_or_cidr as ipOrCidr, description, created_at as createdAt
      FROM excluded_ips
      ORDER BY created_at DESC
    `).all() as any[];

    return rows;
  }

  /**
   * 添加排除规则
   */
  static addExcludedIP(input: CreateExcludedIPInput): ExcludedIP {
    const db = getDatabase();

    const result = db.prepare(`
      INSERT INTO excluded_ips (ip_or_cidr, description)
      VALUES (?, ?)
    `).run(input.ipOrCidr, input.description || null);

    return {
      id: result.lastInsertRowid as number,
      ipOrCidr: input.ipOrCidr,
      description: input.description || null,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 删除排除规则
   */
  static deleteExcludedIP(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM excluded_ips WHERE id = ?').run(id);
  }

  /**
   * 检查 IP 是否被排除（公开方法）
   */
  static checkIPExcluded(ip: string): boolean {
    return this.isIPExcluded(ip);
  }
}
