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
    const result = await window.electronAPI.devices.testConnection(id);
    if (result.success) {
      await fetchAll();
    } else {
      const device = devices.value.find(d => d.id === id);
      if (device) {
        device.status = 'offline';
      }
    }
    return result;
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
