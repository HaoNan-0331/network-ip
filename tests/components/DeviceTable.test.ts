import { describe, it, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import DeviceTable from '../../src/renderer/src/components/DeviceTable.vue';
import type { Device } from '../../src/shared/types/device';

describe('DeviceTable', () => {
  const mockDevices: Device[] = [
    {
      id: 1,
      name: 'Switch-Core',
      ip: '192.168.1.1',
      vendor: 'huawei',
      protocol: 'ssh',
      port: 22,
      username: 'admin',
      encryptedPassword: 'encrypted',
      status: 'online',
      lastChecked: '2026-03-18T00:00:00Z',
      createdAt: '2026-03-18T00:00:00Z',
      updatedAt: '2026-03-18T00:00:00Z',
    },
    {
      id: 2,
      name: 'Router-Edge',
      ip: '192.168.1.2',
      vendor: 'h3c',
      protocol: 'telnet',
      port: 23,
      username: 'admin',
      encryptedPassword: 'encrypted',
      status: 'offline',
      lastChecked: '2026-03-18T00:00:00Z',
      createdAt: '2026-03-18T00:00:00Z',
      updatedAt: '2026-03-18T00:00:00Z',
    },
    {
      id: 3,
      name: 'Switch-Access',
      ip: '192.168.1.3',
      vendor: 'ruijie',
      protocol: 'ssh',
      port: 22,
      username: 'admin',
      encryptedPassword: 'encrypted',
      status: 'unknown',
      lastChecked: null,
      createdAt: '2026-03-18T00:00:00Z',
      updatedAt: '2026-03-18T00:00:00Z',
    },
  ];

  it('should have vendorLabels mapping', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    expect(vm.vendorLabels.huawei).toBe('华为');
    expect(vm.vendorLabels.h3c).toBe('华三');
    expect(vm.vendorLabels.ruijie).toBe('锐捷');
    expect(vm.vendorLabels.cisco).toBe('思科');
  });

  it('should have statusLabels mapping', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    expect(vm.statusLabels.online).toBe('在线');
    expect(vm.statusLabels.offline).toBe('离线');
    expect(vm.statusLabels.unknown).toBe('未知');
  });

  it('should have statusTypes mapping', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    expect(vm.statusTypes.online).toBe('success');
    expect(vm.statusTypes.offline).toBe('danger');
    expect(vm.statusTypes.unknown).toBe('info');
  });

  it('should emit edit event when handleEdit is called', async () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    vm.handleEdit(mockDevices[0]);

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')![0]).toEqual([mockDevices[0]]);
  });

  it('should emit delete event when handleDelete is called', async () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    vm.handleDelete(mockDevices[0]);

    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('delete')![0]).toEqual([mockDevices[0]]);
  });

  it('should emit test event when handleTestConnection is called', async () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    const vm = wrapper.vm as any;
    vm.handleTestConnection(mockDevices[0]);

    expect(wrapper.emitted('test')).toBeTruthy();
    expect(wrapper.emitted('test')![0]).toEqual([mockDevices[0].id]);
  });

  it('should accept devices prop', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    expect(wrapper.props('devices')).toEqual(mockDevices);
  });

  it('should accept loading prop', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices, loading: true },
    });

    expect(wrapper.props('loading')).toBe(true);
  });

  it('should render el-table component', () => {
    const wrapper = shallowMount(DeviceTable, {
      props: { devices: mockDevices },
    });

    expect(wrapper.findComponent({ name: 'ElTable' }).exists()).toBe(true);
  });
});
