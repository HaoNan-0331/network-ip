import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../../../shared/types/device';

export const useDeviceStore = defineStore('devices', () => {
  const devices = ref<Device[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      devices.value = await window.electronAPI.devices.getAll();
    } catch (e) {
      error.value = (e as Error).message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function create(input: CreateDeviceInput): Promise<Device> {
    const device = await window.electronAPI.devices.create(input);
    devices.value.unshift(device);
    return device;
  }

  async function update(input: UpdateDeviceInput): Promise<Device> {
    const device = await window.electronAPI.devices.update(input);
    const index = devices.value.findIndex(d => d.id === input.id);
    if (index !== -1) {
      devices.value[index] = device;
    }
    return device;
  }

  async function remove(id: number): Promise<void> {
    await window.electronAPI.devices.delete(id);
    devices.value = devices.value.filter(d => d.id !== id);
  }

  async function testConnection(id: number): Promise<ConnectionTestResult> {
    console.log(`[Store] testConnection called for id: ${id}`);
    loading.value = true;
    try {
      console.log('[Store] Calling IPC testConnection...');
      const result = await window.electronAPI.devices.testConnection(id);
      console.log('[Store] IPC result:', result);
      // 重新获取设备列表以更新状态
      await fetchAll();
      console.log('[Store] Devices refreshed');
      return result;
    } catch (error) {
      console.error('[Store] testConnection error:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    devices,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
    testConnection,
  };
});
