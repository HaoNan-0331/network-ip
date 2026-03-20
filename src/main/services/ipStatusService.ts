import { getDatabase } from './database';

/**
 * IP 状态类型
 */
export type IPStatusType = 'used' | 'deprecated';

/**
 * IP 状态记录
 */
export interface IPStatus {
  ip: string;
  mac: string | null;
  status: IPStatusType;
  firstSeen: string;
  lastSeen: string;
  updatedAt: string;
}

/**
 * IP 状态管理服务
 */
export class IPStatusService {
  /**
   * 开始采集周期 - 将所有 IP 标记为待验证（临时状态）
   * 实际做法：记录本次采集时间戳，用于后续判断
   */
  static beginCollection(): string {
    return new Date().toISOString();
  }

  /**
   * 更新 IP 状态（采集到 IP 时调用）
   */
  static updateIPStatus(ip: string, mac: string, collectionTime: string): void {
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM ip_status WHERE ip = ?').get(ip) as IPStatus | undefined;

    if (existing) {
      // 更新现有记录
      db.prepare(`
        UPDATE ip_status
        SET mac = ?, status = 'used', last_seen = ?, updated_at = CURRENT_TIMESTAMP
        WHERE ip = ?
      `).run(mac, collectionTime, ip);
    } else {
      // 创建新记录
      db.prepare(`
        INSERT INTO ip_status (ip, mac, status, first_seen, last_seen)
        VALUES (?, ?, 'used', ?, ?)
      `).run(ip, mac, collectionTime, collectionTime);
    }
  }

  /**
   * 批量更新 IP 状态
   */
  static batchUpdateIPStatus(entries: Array<{ ip: string; mac: string }>, collectionTime: string): void {
    const db = getDatabase();

    // 使用事务提高性能
    const updateExisting = db.prepare(`
      UPDATE ip_status
      SET mac = ?, status = 'used', last_seen = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ip = ?
    `);

    const insertNew = db.prepare(`
      INSERT INTO ip_status (ip, mac, status, first_seen, last_seen)
      VALUES (?, ?, 'used', ?, ?)
    `);

    const transaction = db.transaction((items: Array<{ ip: string; mac: string }>) => {
      for (const entry of items) {
        const existing = db.prepare('SELECT 1 FROM ip_status WHERE ip = ?').get(entry.ip);
        if (existing) {
          updateExisting.run(entry.mac, collectionTime, entry.ip);
        } else {
          insertNew.run(entry.ip, entry.mac, collectionTime, collectionTime);
        }
      }
    });

    transaction(entries);
  }

  /**
   * 结束采集周期 - 将未在本次采集中的 IP 标记为弃用
   * @param collectionTime 本次采集开始时间
   * @param networkPrefix 网段前缀（如 192.168.1），为空则处理所有
   */
  static endCollection(collectionTime: string, networkPrefix?: string): number {
    const db = getDatabase();

    // 将 last_seen 早于本次采集时间的 IP 标记为弃用
    let query = `
      UPDATE ip_status
      SET status = 'deprecated', updated_at = CURRENT_TIMESTAMP
      WHERE last_seen < ? AND status = 'used'
    `;
    const params: any[] = [collectionTime];

    if (networkPrefix) {
      query += ' AND ip LIKE ?';
      params.push(`${networkPrefix}.%`);
    }

    const result = db.prepare(query).run(...params);
    return result.changes;
  }

  /**
   * 获取 IP 状态
   */
  static getIPStatus(ip: string): IPStatus | null {
    const db = getDatabase();
    return db.prepare('SELECT * FROM ip_status WHERE ip = ?').get(ip) as IPStatus | null;
  }

  /**
   * 获取网段内所有 IP 状态
   */
  static getIPStatusByPrefix(prefix: string): IPStatus[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM ip_status
      WHERE ip LIKE ?
      ORDER BY ip
    `).all(`${prefix}.%`) as IPStatus[];
  }

  /**
   * 获取状态统计
   */
  static getStatusStats(prefix?: string): { used: number; deprecated: number } {
    const db = getDatabase();

    let query = 'SELECT status, COUNT(*) as count FROM ip_status';
    const params: any[] = [];

    if (prefix) {
      query += ' WHERE ip LIKE ?';
      params.push(`${prefix}.%`);
    }

    query += ' GROUP BY status';

    const rows = db.prepare(query).all(...params) as any[];

    const stats = { used: 0, deprecated: 0 };
    for (const row of rows) {
      if (row.status === 'used') stats.used = row.count;
      if (row.status === 'deprecated') stats.deprecated = row.count;
    }

    return stats;
  }
}
