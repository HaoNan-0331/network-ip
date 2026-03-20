import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../../../shared/types/device';
import type { ARPCollectionResult } from '../../../shared/types/arp';
import type { NetworkSegment, IPUsage, IPDetail, CreateNetworkInput, UpdateNetworkInput } from '../../../shared/types/network';
import type { IPMACChange, ChangeStats, IPMACBinding, ExcludedIP, CreateExcludedIPInput } from '../../../shared/types/anomaly';
import type { OUIEntry, CreateOUIInput, UpdateOUIInput, OUIStats } from '../../../shared/types/oui';
import type { ScheduleConfig, SchedulerStatus, UpdateScheduleInput } from '../../../shared/types/scheduler';

export interface ElectronAPI {
  devices: {
    getAll: () => Promise<Device[]>;
    create: (input: CreateDeviceInput) => Promise<Device>;
    update: (input: UpdateDeviceInput) => Promise<Device>;
    delete: (id: number) => Promise<void>;
    testConnection: (id: number) => Promise<ConnectionTestResult>;
  };
  arp: {
    collectFromDevice: (deviceId: number) => Promise<ARPCollectionResult>;
    collectFromAll: () => Promise<ARPCollectionResult[]>;
  };
  network: {
    getAll: () => Promise<NetworkSegment[]>;
    getById: (id: number) => Promise<NetworkSegment | null>;
    create: (input: CreateNetworkInput) => Promise<NetworkSegment>;
    update: (input: UpdateNetworkInput) => Promise<NetworkSegment | null>;
    delete: (id: number) => Promise<void>;
    autoDiscover: () => Promise<NetworkSegment[]>;
    getIPUsage: (networkId: number) => Promise<IPUsage>;
    getIPDetails: (
      networkId: number,
      searchIp?: string,
      searchMac?: string,
      sortBy?: string,
      sortOrder?: string
    ) => Promise<IPDetail[]>;
  };
  anomaly: {
    getChanges: (unacknowledgedOnly?: boolean, limit?: number) => Promise<IPMACChange[]>;
    acknowledge: (id: number, notes?: string) => Promise<void>;
    acknowledgeAll: () => Promise<number>;
    deleteChange: (id: number) => Promise<void>;
    deleteChanges: (ids: number[]) => Promise<number>;
    getStats: () => Promise<ChangeStats>;
    getBindingHistory: (ip: string) => Promise<IPMACBinding[]>;
    getExcludedIPs: () => Promise<ExcludedIP[]>;
    addExcludedIP: (input: CreateExcludedIPInput) => Promise<ExcludedIP>;
    deleteExcludedIP: (id: number) => Promise<void>;
    checkIPExcluded: (ip: string) => Promise<boolean>;
  };
  export: {
    arpTable: () => Promise<string | null>;
    changes: (unacknowledgedOnly?: boolean) => Promise<string | null>;
    networkUsage: (networkId?: number) => Promise<string | null>;
  };
  oui: {
    getAll: () => Promise<OUIEntry[]>;
    search: (keyword: string) => Promise<OUIEntry[]>;
    getById: (id: number) => Promise<OUIEntry | null>;
    add: (input: CreateOUIInput) => Promise<OUIEntry>;
    addBatch: (entries: CreateOUIInput[]) => Promise<number>;
    update: (input: UpdateOUIInput) => Promise<OUIEntry | null>;
    delete: (id: number) => Promise<void>;
    deleteBatch: (ids: number[]) => Promise<number>;
    getVendor: (mac: string) => Promise<string>;
    getAllVendors: () => Promise<string[]>;
    getStats: () => Promise<OUIStats>;
  };
  scheduler: {
    getConfig: () => Promise<ScheduleConfig>;
    updateConfig: (input: UpdateScheduleInput) => Promise<ScheduleConfig>;
    runNow: () => Promise<{ success: boolean; message: string; stats?: any }>;
    getStatus: () => Promise<SchedulerStatus>;
  };
  settings: {
    getDbPath: () => Promise<string>;
    getDbSize: () => Promise<string>;
    openDbFolder: () => Promise<void>;
    backup: () => Promise<string | null>;
    restore: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
