import { getDatabase } from './database';
import { OUIService } from './ouiService';
import type { NetworkSegment, IPUsage, IPDetail, CreateNetworkInput, UpdateNetworkInput } from '../../shared/types/network';

/**
 * 网段管理服务
 */
export class NetworkSegmentService {
  /**
   * 获取所有网段
   */
  static getAll(): NetworkSegment[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, name, network, mask, cidr, gateway, description,
             is_auto_discovered as isAutoDiscovered,
             created_at as createdAt, updated_at as updatedAt
      FROM network_segments
      ORDER BY created_at DESC
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      isAutoDiscovered: row.isAutoDiscovered === 1,
    }));
  }

  /**
   * 根据ID获取网段
   */
  static getById(id: number): NetworkSegment | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT id, name, network, mask, cidr, gateway, description,
             is_auto_discovered as isAutoDiscovered,
             created_at as createdAt, updated_at as updatedAt
      FROM network_segments WHERE id = ?
    `).get(id) as any;

    if (!row) return null;

    return {
      ...row,
      isAutoDiscovered: row.isAutoDiscovered === 1,
    };
  }

  /**
   * 创建网段
   */
  static create(input: CreateNetworkInput): NetworkSegment {
    const db = getDatabase();
    const cidr = this.maskToCIDR(input.mask);

    const result = db.prepare(`
      INSERT INTO network_segments (name, network, mask, cidr, gateway, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.name, input.network, input.mask, cidr, input.gateway || null, input.description || null);

    return this.getById(result.lastInsertRowid as number)!;
  }

  /**
   * 更新网段
   */
  static update(input: UpdateNetworkInput): NetworkSegment | null {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.network !== undefined) {
      updates.push('network = ?');
      values.push(input.network);
    }
    if (input.mask !== undefined) {
      updates.push('mask = ?');
      updates.push('cidr = ?');
      values.push(input.mask);
      values.push(this.maskToCIDR(input.mask));
    }
    if (input.gateway !== undefined) {
      updates.push('gateway = ?');
      values.push(input.gateway);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (updates.length === 0) return this.getById(input.id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(input.id);

    db.prepare(`UPDATE network_segments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.getById(input.id);
  }

  /**
   * 删除网段
   */
  static delete(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM network_segments WHERE id = ?').run(id);
  }

  /**
   * 自动发现网段（从ARP数据推断）
   */
  static autoDiscover(): NetworkSegment[] {
    const db = getDatabase();

    // 获取所有ARP条目中的IP地址
    const arpEntries = db.prepare(`
      SELECT DISTINCT ip FROM arp_entries
      ORDER BY ip
    `).all() as any[];

    if (arpEntries.length === 0) {
      console.log('[NetworkSegment] No ARP entries found for auto-discovery');
      return [];
    }

    // 按网段分组
    const segments = new Map<string, { ips: string[]; count: number }>();

    for (const entry of arpEntries) {
      const ip = entry.ip;
      const segment24 = this.getNetworkForIP(ip, 24);  // /24 网段

      if (segment24) {
        const key = segment24.network;
        if (!segments.has(key)) {
          segments.set(key, { ips: [], count: 0 });
        }
        segments.get(key)!.ips.push(ip);
        segments.get(key)!.count++;
      }
    }

    // 过滤掉已有网段，创建新发现的网段
    const existingSegments = this.getAll();
    const existingNetworks = new Set(existingSegments.map(s => s.network));

    const discovered: NetworkSegment[] = [];

    for (const [network, data] of segments) {
      if (!existingNetworks.has(network) && data.count >= 2) {  // 至少2个IP才创建网段
        const cidr = 24;
        const mask = this.cidrToMask(cidr);
        const name = `自动发现-${network}/${cidr}`;

        try {
          const result = db.prepare(`
            INSERT INTO network_segments (name, network, mask, cidr, description, is_auto_discovered)
            VALUES (?, ?, ?, ?, ?, 1)
          `).run(name, network, mask, cidr, `自动发现，包含 ${data.count} 个IP地址`);

          const segment = this.getById(result.lastInsertRowid as number);
          if (segment) {
            discovered.push(segment);
          }
        } catch (e) {
          // 忽略重复错误
        }
      }
    }

    console.log(`[NetworkSegment] Auto-discovered ${discovered.length} new segments`);
    return discovered;
  }

  /**
   * 获取网段IP使用统计
   */
  static getIPUsage(networkId: number): IPUsage {
    const segment = this.getById(networkId);
    if (!segment) {
      return { networkId, total: 0, used: 0, available: 0, usagePercent: 0 };
    }

    const db = getDatabase();

    // 计算总IP数（排除网络地址和广播地址）
    const total = Math.pow(2, 32 - segment.cidr) - 2;

    // 获取网段前缀（如 192.168.1）
    const networkParts = segment.network.split('.');
    const prefix = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;

    // 查询该网段内状态为used的IP数量
    const usedResult = db.prepare(`
      SELECT COUNT(*) as count FROM ip_status
      WHERE ip LIKE ? AND status = 'used'
    `).get(`${prefix}.%`) as { count: number };

    const used = usedResult.count;
    const available = Math.max(0, total - used);
    const usagePercent = total > 0 ? Math.round((used / total) * 100) : 0;

    return { networkId, total, used, available, usagePercent };
  }

  /**
   * 获取网段内IP详情列表
   * @param networkId 网段ID
   * @param searchIp 搜索IP（可选）
   * @param searchMac 搜索MAC（可选）
   * @param sortBy 排序字段（ip/mac/lastSeen）
   * @param sortOrder 排序方向（asc/desc）
   */
  static getIPDetails(
    networkId: number,
    searchIp?: string,
    searchMac?: string,
    sortBy: string = 'ip',
    sortOrder: string = 'asc'
  ): IPDetail[] {
    const segment = this.getById(networkId);
    if (!segment) return [];

    const db = getDatabase();

    // 获取网段前缀（如 192.168.1）
    const networkParts = segment.network.split('.');
    const prefix = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;

    // 构建查询条件
    const conditions: string[] = ['ips.ip LIKE ?'];
    const params: any[] = [`${prefix}.%`];

    if (searchIp) {
      conditions.push('ips.ip LIKE ?');
      params.push(`%${searchIp}%`);
    }

    if (searchMac) {
      conditions.push('ips.mac LIKE ?');
      params.push(`%${searchMac}%`);
    }

    // 验证排序字段
    const validSortFields = ['ip', 'mac', 'lastSeen'];
    const validSortOrder = ['asc', 'desc'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'ip';
    const safeSortOrder = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

    // 映射排序字段到数据库列
    const sortColumnMap: Record<string, string> = {
      'ip': 'ips.ip',
      'mac': 'ips.mac',
      'lastSeen': 'ips.last_seen'
    };

    // 从 ip_status 表获取IP状态，并关联 arp_entries 获取接口和设备信息
    const query = `
      SELECT
        ips.ip,
        ips.mac,
        ips.status,
        ips.last_seen as collectedAt,
        arp.interface,
        d.name as deviceName
      FROM ip_status ips
      LEFT JOIN (
        SELECT ip, interface, device_id, ROW_NUMBER() OVER (PARTITION BY ip ORDER BY collected_at DESC) as rn
        FROM arp_entries
      ) arp ON arp.ip = ips.ip AND arp.rn = 1
      LEFT JOIN devices d ON arp.device_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumnMap[safeSortBy]} ${safeSortOrder.toUpperCase()}
    `;

    console.log('[NetworkSegment] Query params:', params);

    const entries = db.prepare(query).all(...params) as any[];

    // 转换为IP详情
    const details: IPDetail[] = entries.map(entry => ({
      ip: entry.ip,
      mac: entry.mac,
      macVendor: entry.mac ? this.getMACVendor(entry.mac) : undefined,
      status: entry.status as 'used' | 'deprecated',
      lastSeen: entry.collectedAt,
      interface: entry.interface,
      deviceName: entry.deviceName,
    }));

    return details;
  }

  // ============ 辅助方法 ============

  /**
   * 子网掩码转CIDR
   */
  private static maskToCIDR(mask: string): number {
    const parts = mask.split('.').map(p => parseInt(p, 10));
    let cidr = 0;
    for (const part of parts) {
      cidr += (part.toString(2).match(/1/g) || []).length;
    }
    return cidr;
  }

  /**
   * CIDR转子网掩码
   */
  private static cidrToMask(cidr: number): string {
    const mask: number[] = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.min(8, Math.max(0, cidr - i * 8));
      mask.push(256 - Math.pow(2, 8 - bits));
    }
    return mask.join('.');
  }

  /**
   * 获取IP所在网段
   */
  private static getNetworkForIP(ip: string, cidr: number): { network: string } | null {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4) return null;

    // 简单的 /24 网段计算
    return {
      network: `${parts[0]}.${parts[1]}.${parts[2]}.0`,
    };
  }

  /**
   * 网络地址转整数
   */
  private static networkToInt(network: string): number {
    const parts = network.split('.').map(p => parseInt(p, 10));
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * 计算广播地址
   */
  private static broadcastAddress(network: string, cidr: number): number {
    const networkInt = this.networkToInt(network);
    const hostBits = 32 - cidr;
    const broadcast = networkInt | ((1 << hostBits) - 1);
    return broadcast;
  }

  /**
   * 获取MAC厂商
   */
  private static getMACVendor(mac: string): string | undefined {
    const vendor = OUIService.getVendor(mac);
    return vendor === 'Unknown' ? undefined : vendor;
  }
}
