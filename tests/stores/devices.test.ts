import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeviceStore } from '../../src/renderer/src/stores/devices';
import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../../src/shared/types/device';

describe('useDeviceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockDevice: Device = {
    id: 1,
    name: 'Test Device',
    ip: '192.168.1.1',
    vendor: 'huawei',
    protocol: 'ssh',
    port: 22,
    username: 'admin',
    encryptedPassword: 'encrypted',
    status: 'unknown',
    lastChecked: null,
    createdAt: '2026-03-18T00:00:00Z',
    updatedAt: '2026-03-18T00:00:00Z',
  };

  describe('fetchAll', () => {
    it('should populate devices array from IPC', async () => {
      const mockDevices = [mockDevice];
      (window.electronAPI.devices.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(mockDevices);

      const store = useDeviceStore();
      await store.fetchAll();

      expect(store.devices).toEqual(mockDevices);
      expect(store.loading).toBe(false);
      expect(window.electronAPI.devices.getAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should add device to array', async () => {
      const newDevice = { ...mockDevice, id: 2, name: 'New Device' };
      (window.electronAPI.devices.create as ReturnType<typeof vi.fn>).mockResolvedValue(newDevice);

      const store = useDeviceStore();
      const input: CreateDeviceInput = {
        name: 'New Device',
        ip: '192.168.1.2',
        vendor: 'huawei',
        protocol: 'ssh',
        port: 22,
        username: 'admin',
        password: 'password',
      };

      const result = await store.create(input);

      expect(result).toEqual(newDevice);
      expect(store.devices[0]).toEqual(newDevice);
      expect(window.electronAPI.devices.create).toHaveBeenCalledWith(input);
    });
  });

  describe('update', () => {
    it('should modify existing device in array', async () => {
      const existingDevice = { ...mockDevice };
      const updatedDevice = { ...mockDevice, name: 'Updated Name' };
      (window.electronAPI.devices.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([existingDevice]);
      (window.electronAPI.devices.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedDevice);

      const store = useDeviceStore();
      await store.fetchAll();

      const input: UpdateDeviceInput = { id: 1, name: 'Updated Name' };
      const result = await store.update(input);

      expect(result).toEqual(updatedDevice);
      expect(store.devices[0].name).toBe('Updated Name');
      expect(window.electronAPI.devices.update).toHaveBeenCalledWith(input);
    });
  });

  describe('remove', () => {
    it('should delete device from array', async () => {
      (window.electronAPI.devices.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([mockDevice]);
      (window.electronAPI.devices.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const store = useDeviceStore();
      await store.fetchAll();

      expect(store.devices).toHaveLength(1);

      await store.remove(1);

      expect(store.devices).toHaveLength(0);
      expect(window.electronAPI.devices.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('testConnection', () => {
    it('should return result without modifying array on failure', async () => {
      (window.electronAPI.devices.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([mockDevice]);
      const result: ConnectionTestResult = { success: false, error: 'Connection refused' };
      (window.electronAPI.devices.testConnection as ReturnType<typeof vi.fn>).mockResolvedValue(result);

      const store = useDeviceStore();
      await store.fetchAll();

      const testResult = await store.testConnection(1);

      expect(testResult).toEqual(result);
      expect(store.devices[0].status).toBe('offline');
      expect(window.electronAPI.devices.testConnection).toHaveBeenCalledWith(1);
    });

    it('should refresh devices on success', async () => {
      const onlineDevice = { ...mockDevice, status: 'online' as const };
      (window.electronAPI.devices.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([onlineDevice]);
      const result: ConnectionTestResult = { success: true };
      (window.electronAPI.devices.testConnection as ReturnType<typeof vi.fn>).mockResolvedValue(result);

      const store = useDeviceStore();
      await store.fetchAll();

      const testResult = await store.testConnection(1);

      expect(testResult.success).toBe(true);
      expect(window.electronAPI.devices.getAll).toHaveBeenCalledTimes(2);
    });
  });
});
