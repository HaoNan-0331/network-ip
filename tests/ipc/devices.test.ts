import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock database functions
const mockPrepareResult = {
  all: vi.fn(() => []),
  get: vi.fn(() => null),
  run: vi.fn(() => ({ lastInsertRowid: 1 })),
};

const mockDb = {
  prepare: vi.fn(() => mockPrepareResult),
  exec: vi.fn(),
  pragma: vi.fn(),
  close: vi.fn(),
};

// Mock Electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: vi.fn(() => '/tmp'),
  },
}));

// Mock better-sqlite3
vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => mockDb),
}));

// Mock database service
vi.mock('../../src/main/services/database', () => ({
  initDatabase: vi.fn(() => mockDb),
  getDatabase: vi.fn(() => mockDb),
  closeDatabase: vi.fn(),
}));

// Mock CredentialService
vi.mock('../../src/main/services/credential', () => ({
  CredentialService: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn((p: string) => `encrypted:${p}`),
    decrypt: vi.fn((p: string) => p.replace('encrypted:', '')),
  })),
}));

// Mock SSHService
vi.mock('../../src/main/services/ssh', () => ({
  SSHService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock TelnetService
vi.mock('../../src/main/services/telnet', () => ({
  TelnetService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { ipcMain } from 'electron';
import { registerDeviceHandlers } from '../../src/main/ipc/devices';

describe('Device IPC Handlers', () => {
  let handlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();

    // Reset mock return values
    mockPrepareResult.all.mockReturnValue([]);
    mockPrepareResult.get.mockReturnValue(null);
    mockPrepareResult.run.mockReturnValue({ lastInsertRowid: 1 });

    // Capture registered handlers
    (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDeviceHandlers', () => {
    it('should register devices:getAll handler', () => {
      registerDeviceHandlers();
      expect(handlers.has('devices:getAll')).toBe(true);
    });

    it('should register devices:create handler', () => {
      registerDeviceHandlers();
      expect(handlers.has('devices:create')).toBe(true);
    });

    it('should register devices:update handler', () => {
      registerDeviceHandlers();
      expect(handlers.has('devices:update')).toBe(true);
    });

    it('should register devices:delete handler', () => {
      registerDeviceHandlers();
      expect(handlers.has('devices:delete')).toBe(true);
    });

    it('should register devices:testConnection handler', () => {
      registerDeviceHandlers();
      expect(handlers.has('devices:testConnection')).toBe(true);
    });

    it('should register all 5 handlers', () => {
      registerDeviceHandlers();
      expect(handlers.size).toBe(5);
    });
  });

  describe('devices:getAll', () => {
    it('should return empty array initially', async () => {
      mockPrepareResult.all.mockReturnValue([]);
      registerDeviceHandlers();
      const handler = handlers.get('devices:getAll');
      const result = await handler!();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('devices:create', () => {
    it('should create device with encrypted password', async () => {
      mockPrepareResult.run.mockReturnValue({ lastInsertRowid: 1 });
      registerDeviceHandlers();
      const handler = handlers.get('devices:create');

      const input = {
        name: 'Test Switch',
        ip: '192.168.1.1',
        vendor: 'huawei' as const,
        protocol: 'ssh' as const,
        port: 22,
        username: 'admin',
        password: 'secret123',
      };

      const result = await handler!({}, input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Switch');
      expect(result.ip).toBe('192.168.1.1');
      expect(result.vendor).toBe('huawei');
      expect(result.protocol).toBe('ssh');
      expect(result.encryptedPassword).toContain('encrypted:');
    });
  });

  describe('devices:update', () => {
    it('should update device fields', async () => {
      mockPrepareResult.get.mockReturnValue({
        id: 1,
        name: 'Updated Switch',
        ip: '192.168.1.1',
        vendor: 'huawei',
        protocol: 'ssh',
        port: 22,
        username: 'admin',
        encrypted_password: 'encrypted:secret',
        status: 'unknown',
        last_checked: null,
        created_at: '2026-03-18T00:00:00Z',
        updated_at: '2026-03-18T01:00:00Z',
      });

      registerDeviceHandlers();
      const handler = handlers.get('devices:update');

      const input = {
        id: 1,
        name: 'Updated Switch',
      };

      const result = await handler!({}, input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Switch');
    });
  });

  describe('devices:delete', () => {
    it('should delete device', async () => {
      registerDeviceHandlers();
      const handler = handlers.get('devices:delete');

      // Should not throw
      await expect(handler!({}, 1)).resolves.not.toThrow();
      expect(mockPrepareResult.run).toHaveBeenCalled();
    });
  });

  describe('devices:testConnection', () => {
    it('should return error for non-existent device', async () => {
      mockPrepareResult.get.mockReturnValue(null);
      registerDeviceHandlers();
      const handler = handlers.get('devices:testConnection');

      const result = await handler!({}, 999);

      expect(result).toEqual({ success: false, error: 'Device not found' });
    });

    it('should update status to online on successful SSH connection', async () => {
      mockPrepareResult.get.mockReturnValue({
        id: 1,
        name: 'Test Switch',
        ip: '192.168.1.1',
        vendor: 'huawei',
        protocol: 'ssh',
        port: 22,
        username: 'admin',
        encrypted_password: 'encrypted:secret',
      });

      registerDeviceHandlers();
      const handler = handlers.get('devices:testConnection');

      const result = await handler!({}, 1);

      expect(result).toEqual({ success: true });
      // Check that status update query was called
      expect(mockPrepareResult.run).toHaveBeenCalled();
    });

    it('should update status to offline on connection failure', async () => {
      mockPrepareResult.get.mockReturnValue({
        id: 1,
        name: 'Test Switch',
        ip: '192.168.1.1',
        vendor: 'huawei',
        protocol: 'ssh',
        port: 22,
        username: 'admin',
        encrypted_password: 'encrypted:secret',
      });

      // Mock SSHService to throw error
      const { SSHService } = await import('../../src/main/services/ssh');
      (SSHService as any).mockImplementationOnce(() => ({
        connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
        disconnect: vi.fn(),
      }));

      registerDeviceHandlers();
      const handler = handlers.get('devices:testConnection');

      const result = await handler!({}, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});
