import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DeviceForm from '../../src/renderer/src/components/DeviceForm.vue';
import type { Device } from '../../src/shared/types/device';
import { nextTick } from 'vue';

describe('DeviceForm', () => {
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

  it('should render form with all required fields', () => {
    const wrapper = mount(DeviceForm);

    expect(wrapper.find('el-form').exists() || wrapper.find('.el-form').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ElFormItem' }).exists() || wrapper.html()).toContain('name');
  });

  it('should have vendor select with 4 options', () => {
    const wrapper = mount(DeviceForm);
    const html = wrapper.html();

    expect(html).toContain('huawei');
    expect(html).toContain('h3c');
    expect(html).toContain('ruijie');
    expect(html).toContain('cisco');
  });

  it('should have protocol radio with SSH and Telnet options', () => {
    const wrapper = mount(DeviceForm);
    const html = wrapper.html();

    expect(html).toContain('ssh');
    expect(html).toContain('telnet');
  });

  it('should default port to 22 for SSH protocol', async () => {
    const wrapper = mount(DeviceForm);
    const vm = wrapper.vm as any;

    expect(vm.formData.port).toBe(22);
  });

  it('should update port to 23 when protocol changes to Telnet', async () => {
    const wrapper = mount(DeviceForm);
    const vm = wrapper.vm as any;

    vm.handleProtocolChange('telnet');
    await nextTick();

    expect(vm.formData.port).toBe(23);
  });

  it('should update port to 22 when protocol changes to SSH', async () => {
    const wrapper = mount(DeviceForm);
    const vm = wrapper.vm as any;

    vm.formData.port = 23;
    vm.handleProtocolChange('ssh');
    await nextTick();

    expect(vm.formData.port).toBe(22);
  });

  it('should populate form with existing device data in edit mode', async () => {
    const wrapper = mount(DeviceForm, {
      props: {
        device: mockDevice,
      },
    });
    const vm = wrapper.vm as any;

    await nextTick();

    expect(vm.formData.name).toBe(mockDevice.name);
    expect(vm.formData.ip).toBe(mockDevice.ip);
    expect(vm.formData.vendor).toBe(mockDevice.vendor);
    expect(vm.formData.protocol).toBe(mockDevice.protocol);
    expect(vm.formData.port).toBe(mockDevice.port);
    expect(vm.formData.username).toBe(mockDevice.username);
    expect(vm.formData.password).toBe('');
  });

  it('should expose validate, getFormData, and resetForm methods', () => {
    const wrapper = mount(DeviceForm);
    const vm = wrapper.vm as any;

    expect(typeof vm.validate).toBe('function');
    expect(typeof vm.getFormData).toBe('function');
    expect(typeof vm.resetForm).toBe('function');
  });

  it('should return form data from getFormData', () => {
    const wrapper = mount(DeviceForm);
    const vm = wrapper.vm as any;

    const formData = vm.getFormData();

    expect(formData).toHaveProperty('name');
    expect(formData).toHaveProperty('ip');
    expect(formData).toHaveProperty('vendor');
    expect(formData).toHaveProperty('protocol');
    expect(formData).toHaveProperty('port');
    expect(formData).toHaveProperty('username');
    expect(formData).toHaveProperty('password');
  });
});
