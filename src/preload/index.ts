import { contextBridge, ipcRenderer } from 'electron';
import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../shared/types/device';
import type { ARPCollectionResult } from '../shared/types/arp';
import type { NetworkSegment, IPUsage, IPDetail, CreateNetworkInput, UpdateNetworkInput } from '../shared/types/network';
import type { IPMACChange, ChangeStats, IPMACBinding, ExcludedIP, CreateExcludedIPInput } from '../shared/types/anomaly';
import type { OUIEntry, CreateOUIInput, UpdateOUIInput, OUIStats } from '../shared/types/oui';
import type { ScheduleConfig, SchedulerStatus, UpdateScheduleInput } from '../shared/types/scheduler';

const electronAPI = {
  devices: {
    getAll: (): Promise<Device[]> => ipcRenderer.invoke('devices:getAll'),
    create: (input: CreateDeviceInput): Promise<Device> =>
      ipcRenderer.invoke('devices:create', input),
    update: (input: UpdateDeviceInput): Promise<Device> =>
      ipcRenderer.invoke('devices:update', input),
    delete: (id: number): Promise<void> => ipcRenderer.invoke('devices:delete', id),
    testConnection: (id: number): Promise<ConnectionTestResult> =>
      ipcRenderer.invoke('devices:testConnection', id),
  },
  arp: {
    collectFromDevice: (deviceId: number): Promise<ARPCollectionResult> =>
      ipcRenderer.invoke('arp:collectFromDevice', deviceId),
    collectFromAll: (): Promise<ARPCollectionResult[]> =>
      ipcRenderer.invoke('arp:collectFromAll'),
  },
  network: {
    getAll: (): Promise<NetworkSegment[]> =>
      ipcRenderer.invoke('network:getAll'),
    getById: (id: number): Promise<NetworkSegment | null> =>
      ipcRenderer.invoke('network:getById', id),
    create: (input: CreateNetworkInput): Promise<NetworkSegment> =>
      ipcRenderer.invoke('network:create', input),
    update: (input: UpdateNetworkInput): Promise<NetworkSegment | null> =>
      ipcRenderer.invoke('network:update', input),
    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('network:delete', id),
    autoDiscover: (): Promise<NetworkSegment[]> =>
      ipcRenderer.invoke('network:autoDiscover'),
    getIPUsage: (networkId: number): Promise<IPUsage> =>
      ipcRenderer.invoke('network:getIPUsage', networkId),
    getIPDetails: (
      networkId: number,
      searchIp?: string,
      searchMac?: string,
      sortBy?: string,
      sortOrder?: string
    ): Promise<IPDetail[]> =>
      ipcRenderer.invoke('network:getIPDetails', networkId, searchIp, searchMac, sortBy, sortOrder),
  },
  anomaly: {
    getChanges: (unacknowledgedOnly?: boolean, limit?: number): Promise<IPMACChange[]> =>
      ipcRenderer.invoke('anomaly:getChanges', unacknowledgedOnly, limit),
    acknowledge: (id: number, notes?: string): Promise<void> =>
      ipcRenderer.invoke('anomaly:acknowledge', id, notes),
    acknowledgeAll: (): Promise<number> =>
      ipcRenderer.invoke('anomaly:acknowledgeAll'),
    deleteChange: (id: number): Promise<void> =>
      ipcRenderer.invoke('anomaly:deleteChange', id),
    deleteChanges: (ids: number[]): Promise<number> =>
      ipcRenderer.invoke('anomaly:deleteChanges', ids),
    getStats: (): Promise<ChangeStats> =>
      ipcRenderer.invoke('anomaly:getStats'),
    getBindingHistory: (ip: string): Promise<IPMACBinding[]> =>
      ipcRenderer.invoke('anomaly:getBindingHistory', ip),
    // 排除IP管理
    getExcludedIPs: (): Promise<ExcludedIP[]> =>
      ipcRenderer.invoke('anomaly:getExcludedIPs'),
    addExcludedIP: (input: CreateExcludedIPInput): Promise<ExcludedIP> =>
      ipcRenderer.invoke('anomaly:addExcludedIP', input),
    deleteExcludedIP: (id: number): Promise<void> =>
      ipcRenderer.invoke('anomaly:deleteExcludedIP', id),
    checkIPExcluded: (ip: string): Promise<boolean> =>
      ipcRenderer.invoke('anomaly:checkIPExcluded', ip),
  },
  export: {
    arpTable: (): Promise<string | null> =>
      ipcRenderer.invoke('export:arpTable'),
    changes: (unacknowledgedOnly?: boolean): Promise<string | null> =>
      ipcRenderer.invoke('export:changes', unacknowledgedOnly),
    networkUsage: (networkId?: number): Promise<string | null> =>
      ipcRenderer.invoke('export:networkUsage', networkId),
  },
  oui: {
    getAll: (): Promise<OUIEntry[]> =>
      ipcRenderer.invoke('oui:getAll'),
    search: (keyword: string): Promise<OUIEntry[]> =>
      ipcRenderer.invoke('oui:search', keyword),
    getById: (id: number): Promise<OUIEntry | null> =>
      ipcRenderer.invoke('oui:getById', id),
    add: (input: CreateOUIInput): Promise<OUIEntry> =>
      ipcRenderer.invoke('oui:add', input),
    addBatch: (entries: CreateOUIInput[]): Promise<number> =>
      ipcRenderer.invoke('oui:addBatch', entries),
    update: (input: UpdateOUIInput): Promise<OUIEntry | null> =>
      ipcRenderer.invoke('oui:update', input),
    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke('oui:delete', id),
    deleteBatch: (ids: number[]): Promise<number> =>
      ipcRenderer.invoke('oui:deleteBatch', ids),
    getVendor: (mac: string): Promise<string> =>
      ipcRenderer.invoke('oui:getVendor', mac),
    getAllVendors: (): Promise<string[]> =>
      ipcRenderer.invoke('oui:getAllVendors'),
    getStats: (): Promise<OUIStats> =>
      ipcRenderer.invoke('oui:getStats'),
  },
  scheduler: {
    getConfig: (): Promise<ScheduleConfig> =>
      ipcRenderer.invoke('scheduler:getConfig'),
    updateConfig: (input: UpdateScheduleInput): Promise<ScheduleConfig> =>
      ipcRenderer.invoke('scheduler:updateConfig', input),
    runNow: (): Promise<{ success: boolean; message: string; stats?: any }> =>
      ipcRenderer.invoke('scheduler:runNow'),
    getStatus: (): Promise<SchedulerStatus> =>
      ipcRenderer.invoke('scheduler:getStatus'),
  },
  settings: {
    getDbPath: (): Promise<string> =>
      ipcRenderer.invoke('settings:getDbPath'),
    getDbSize: (): Promise<string> =>
      ipcRenderer.invoke('settings:getDbSize'),
    openDbFolder: (): Promise<void> =>
      ipcRenderer.invoke('settings:openDbFolder'),
    backup: (): Promise<string | null> =>
      ipcRenderer.invoke('settings:backup'),
    reset: (): Promise<boolean> =>
      ipcRenderer.invoke('settings:reset'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
