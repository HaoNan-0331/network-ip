/**
 * 网段类型定义
 */

export interface NetworkSegment {
  id: number;
  name: string;
  network: string;        // 网段地址，如 192.168.1.0
  mask: string;           // 子网掩码，如 255.255.255.0
  cidr: number;           // CIDR 表示法，如 24
  gateway?: string;       // 网关地址
  description?: string;   // 描述
  isAutoDiscovered: boolean;  // 是否自动发现
  createdAt: string;
  updatedAt: string;
}

export interface IPUsage {
  networkId: number;
  total: number;          // 总IP数
  used: number;           // 已使用IP数
  available: number;      // 可用IP数
  usagePercent: number;   // 使用率百分比
}

export interface IPDetail {
  ip: string;
  mac?: string;
  macVendor?: string;     // MAC厂商信息
  status: 'used' | 'deprecated';  // used: 本次采集到, deprecated: 未采集到
  lastSeen?: string;      // 最后发现时间
  hostname?: string;
  interface?: string;
  deviceName?: string;    // 来源设备名称
}

export interface CreateNetworkInput {
  name: string;
  network: string;
  mask: string;
  gateway?: string;
  description?: string;
}

export interface UpdateNetworkInput {
  id: number;
  name?: string;
  network?: string;
  mask?: string;
  gateway?: string;
  description?: string;
}
