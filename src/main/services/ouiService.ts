import { getDatabase } from './database';

/**
 * OUI 数据条目
 */
export interface OUIEntry {
  id: number;
  ouiPrefix: string;
  vendorName: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建/更新 OUI 的输入
 */
export interface CreateOUIInput {
  ouiPrefix: string;
  vendorName: string;
}

export interface UpdateOUIInput {
  id: number;
  ouiPrefix?: string;
  vendorName?: string;
}

/**
 * OUI 服务类 - 管理 MAC 地址厂商查询
 */
export class OUIService {
  /**
   * 根据 MAC 地址查询厂商
   * @param mac MAC 地址（支持 : 或 - 分隔）
   * @returns 厂商名称，未找到返回 'Unknown'
   */
  static getVendor(mac: string): string {
    if (!mac) return 'Unknown';

    const db = getDatabase();

    // 标准化 MAC 地址：移除分隔符，转大写
    const normalizedMac = mac.replace(/[:\-\.]/g, '').toUpperCase();

    // 获取前6位作为 OUI
    const oui = normalizedMac.substring(0, 6);

    // 从数据库查询
    const row = db.prepare('SELECT vendor_name FROM oui_database WHERE oui_prefix = ?').get(oui) as { vendor_name: string } | undefined;

    return row?.vendor_name || 'Unknown';
  }

  /**
   * 批量查询 MAC 厂商
   * @param macs MAC 地址列表
   * @returns MAC -> 厂商 的映射
   */
  static getVendors(macs: string[]): Map<string, string> {
    const result = new Map<string, string>();
    for (const mac of macs) {
      result.set(mac, this.getVendor(mac));
    }
    return result;
  }

  /**
   * 检查 MAC 地址是否属于特定厂商
   * @param mac MAC 地址
   * @param vendorName 厂商名称（部分匹配）
   */
  static isVendor(mac: string, vendorName: string): boolean {
    const vendor = this.getVendor(mac);
    return vendor.toLowerCase().includes(vendorName.toLowerCase());
  }

  // ============ OUI 管理功能 ============

  /**
   * 获取所有 OUI 条目
   */
  static getAll(): OUIEntry[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, oui_prefix as ouiPrefix, vendor_name as vendorName,
             is_custom as isCustom, created_at as createdAt, updated_at as updatedAt
      FROM oui_database
      ORDER BY vendor_name, oui_prefix
    `).all() as OUIEntry[];

    return rows;
  }

  /**
   * 搜索 OUI 条目
   */
  static search(keyword: string): OUIEntry[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, oui_prefix as ouiPrefix, vendor_name as vendorName,
             is_custom as isCustom, created_at as createdAt, updated_at as updatedAt
      FROM oui_database
      WHERE oui_prefix LIKE ? OR vendor_name LIKE ?
      ORDER BY vendor_name, oui_prefix
    `).all(`%${keyword}%`, `%${keyword}%`) as OUIEntry[];

    return rows;
  }

  /**
   * 添加 OUI 条目
   */
  static add(input: CreateOUIInput): OUIEntry {
    const db = getDatabase();

    // 验证 OUI 格式
    const normalizedPrefix = input.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(normalizedPrefix)) {
      throw new Error('OUI 前缀格式无效，需要6位十六进制字符');
    }

    const result = db.prepare(`
      INSERT INTO oui_database (oui_prefix, vendor_name, is_custom)
      VALUES (?, ?, 1)
    `).run(normalizedPrefix, input.vendorName);

    return this.getById(result.lastInsertRowid as number)!;
  }

  /**
   * 批量添加 OUI 条目
   */
  static addBatch(entries: CreateOUIInput[]): number {
    const db = getDatabase();
    let count = 0;

    const insert = db.prepare(`
      INSERT OR REPLACE INTO oui_database (oui_prefix, vendor_name, is_custom)
      VALUES (?, ?, 1)
    `);

    for (const entry of entries) {
      const normalizedPrefix = entry.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase();
      if (/^[0-9A-F]{6}$/.test(normalizedPrefix)) {
        insert.run(normalizedPrefix, entry.vendorName);
        count++;
      }
    }

    return count;
  }

  /**
   * 更新 OUI 条目
   */
  static update(input: UpdateOUIInput): OUIEntry | null {
    const db = getDatabase();

    const updates: string[] = [];
    const values: any[] = [];

    if (input.ouiPrefix !== undefined) {
      const normalizedPrefix = input.ouiPrefix.replace(/[:\-\.]/g, '').toUpperCase();
      if (!/^[0-9A-F]{6}$/.test(normalizedPrefix)) {
        throw new Error('OUI 前缀格式无效，需要6位十六进制字符');
      }
      updates.push('oui_prefix = ?');
      values.push(normalizedPrefix);
    }

    if (input.vendorName !== undefined) {
      updates.push('vendor_name = ?');
      values.push(input.vendorName);
    }

    if (updates.length === 0) return this.getById(input.id);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(input.id);

    db.prepare(`UPDATE oui_database SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.getById(input.id);
  }

  /**
   * 删除 OUI 条目
   */
  static delete(id: number): void {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM oui_database WHERE id = ? AND is_custom = 1').run(id);
    if (result.changes === 0) {
      throw new Error('无法删除系统预设的 OUI 条目');
    }
  }

  /**
   * 批量删除 OUI 条目
   */
  static deleteBatch(ids: number[]): number {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM oui_database WHERE id IN (${placeholders}) AND is_custom = 1`).run(...ids);
    return result.changes;
  }

  /**
   * 根据 ID 获取 OUI 条目
   */
  static getById(id: number): OUIEntry | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT id, oui_prefix as ouiPrefix, vendor_name as vendorName,
             is_custom as isCustom, created_at as createdAt, updated_at as updatedAt
      FROM oui_database WHERE id = ?
    `).get(id) as OUIEntry | undefined;

    return row || null;
  }

  /**
   * 获取所有厂商列表（去重）
   */
  static getAllVendors(): string[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT DISTINCT vendor_name FROM oui_database ORDER BY vendor_name').all() as { vendor_name: string }[];
    return rows.map(r => r.vendor_name);
  }

  /**
   * 获取统计信息
   */
  static getStats(): { total: number; custom: number; vendors: number } {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as count FROM oui_database').get() as { count: number };
    const custom = db.prepare('SELECT COUNT(*) as count FROM oui_database WHERE is_custom = 1').get() as { count: number };
    const vendors = db.prepare('SELECT COUNT(DISTINCT vendor_name) as count FROM oui_database').get() as { count: number };

    return {
      total: total.count,
      custom: custom.count,
      vendors: vendors.count,
    };
  }
}
