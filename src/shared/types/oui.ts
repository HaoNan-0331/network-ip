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
 * 创建 OUI 的输入
 */
export interface CreateOUIInput {
  ouiPrefix: string;
  vendorName: string;
}

/**
 * 更新 OUI 的输入
 */
export interface UpdateOUIInput {
  id: number;
  ouiPrefix?: string;
  vendorName?: string;
}

/**
 * OUI 统计信息
 */
export interface OUIStats {
  total: number;
  custom: number;
  vendors: number;
}
