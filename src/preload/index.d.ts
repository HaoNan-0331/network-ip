import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../shared/types/device';

declare global {
  interface Window {
    electronAPI: {
      devices: {
        getAll: () => Promise<Device[]>;
        create: (input: CreateDeviceInput) => Promise<Device>;
        update: (input: UpdateDeviceInput) => Promise<Device>;
        delete: (id: number) => Promise<void>;
        testConnection: (id: number) => Promise<ConnectionTestResult>;
      };
    };
  }
}

export {};
