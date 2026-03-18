export type DeviceVendor = 'huawei' | 'h3c' | 'ruijie' | 'cisco';
export type DeviceProtocol = 'ssh' | 'telnet';
export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface Device {
  id: number;
  name: string;
  ip: string;
  vendor: DeviceVendor;
  protocol: DeviceProtocol;
  port: number;
  username: string;
  encryptedPassword: string;
  status: DeviceStatus;
  lastChecked: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  name: string;
  ip: string;
  vendor: DeviceVendor;
  protocol: DeviceProtocol;
  port: number;
  username: string;
  password: string;
}

export interface UpdateDeviceInput {
  id: number;
  name?: string;
  ip?: string;
  vendor?: DeviceVendor;
  protocol?: DeviceProtocol;
  port?: number;
  username?: string;
  password?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}
