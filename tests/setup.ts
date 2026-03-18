import { vi } from 'vitest';

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
