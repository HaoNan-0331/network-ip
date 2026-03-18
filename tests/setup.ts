import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock Electron APIs for tests
global.window = global.window || {};
(global.window as any).electronAPI = {
  devices: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
  },
};

// Stub Element Plus components globally
// Using true for stubbing completely avoids template compilation issues
config.global.stubs = {
  ElTable: true,
  ElTableColumn: true,
  ElTag: true,
  ElButton: true,
  ElForm: true,
  ElFormItem: true,
  ElInput: true,
  ElSelect: true,
  ElOption: true,
  ElRadioGroup: true,
  ElRadio: true,
  ElInputNumber: true,
  ElCard: true,
  ElDialog: true,
  ElConfigProvider: true,
};
