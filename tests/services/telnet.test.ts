import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock telnet-client
vi.mock('telnet-client', () => {
  const mockTelnetInstance = {
    connect: vi.fn(),
    exec: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    Telnet: vi.fn().mockImplementation(() => mockTelnetInstance),
  };
});

import { TelnetService, TelnetConfig } from '../../src/main/services/telnet';
import { Telnet } from 'telnet-client';

describe('TelnetService', () => {
  let telnetService: TelnetService;
  let mockTelnet: { connect: ReturnType<typeof vi.fn>; exec: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };

  const defaultConfig: TelnetConfig = {
    host: '192.168.1.1',
    port: 23,
    username: 'admin',
    password: 'password',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock instance
    mockTelnet = new (Telnet as any)();
    telnetService = new TelnetService(defaultConfig);
  });

  describe('constructor', () => {
    it('should use default timeout of 10000ms', () => {
      const service = new TelnetService({ ...defaultConfig });
      expect(service).toBeDefined();
    });

    it('should use default login prompt "Username:"', () => {
      const service = new TelnetService({ ...defaultConfig });
      expect(service).toBeDefined();
    });

    it('should use default password prompt "Password:"', () => {
      const service = new TelnetService({ ...defaultConfig });
      expect(service).toBeDefined();
    });

    it('should use default shell prompt "#"', () => {
      const service = new TelnetService({ ...defaultConfig });
      expect(service).toBeDefined();
    });

    it('should accept custom prompts', () => {
      const service = new TelnetService({
        ...defaultConfig,
        loginPrompt: 'Login:',
        passwordPrompt: 'Pass:',
        shellPrompt: '>',
      });
      expect(service).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should return Telnet instance on success', async () => {
      mockTelnet.connect.mockResolvedValue(undefined);

      const result = await telnetService.connect();

      expect(result).toBeDefined();
      expect(mockTelnet.connect).toHaveBeenCalled();
    });

    it('should throw on timeout', async () => {
      mockTelnet.connect.mockRejectedValue(new Error('Connection timeout'));

      await expect(telnetService.connect()).rejects.toThrow('Connection timeout');
    });

    it('should pass correct connection parameters', async () => {
      mockTelnet.connect.mockResolvedValue(undefined);

      await telnetService.connect();

      const connectCall = mockTelnet.connect.mock.calls[0][0];
      expect(connectCall.host).toBe('192.168.1.1');
      expect(connectCall.port).toBe(23);
      expect(connectCall.username).toBe('admin');
      expect(connectCall.password).toBe('password');
      expect(connectCall.timeout).toBe(10000);
    });
  });

  describe('executeCommand', () => {
    it('should return command output', async () => {
      mockTelnet.exec.mockResolvedValue('command output');

      const result = await telnetService.executeCommand(mockTelnet as any, 'show version');

      expect(result).toBe('command output');
      expect(mockTelnet.exec).toHaveBeenCalledWith('show version');
    });
  });

  describe('disconnect', () => {
    it('should close connection cleanly', async () => {
      mockTelnet.end.mockResolvedValue(undefined);
      mockTelnet.destroy.mockResolvedValue(undefined);

      await telnetService.disconnect(mockTelnet as any);

      expect(mockTelnet.end).toHaveBeenCalled();
      expect(mockTelnet.destroy).toHaveBeenCalled();
    });
  });
});
