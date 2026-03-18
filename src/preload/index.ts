import { contextBridge, ipcRenderer } from 'electron';
import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../shared/types/device';

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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
