import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron's safeStorage before importing the service
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plaintext: string) => Buffer.from(`encrypted:${plaintext}`)),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString('utf-8');
      return str.replace('encrypted:', '');
    }),
  },
}));

import { CredentialService } from '../../src/main/services/credential';

describe('CredentialService', () => {
  let credentialService: CredentialService;

  beforeEach(() => {
    vi.clearAllMocks();
    credentialService = new CredentialService();
  });

  describe('encrypt', () => {
    it('should return base64-encoded string for non-empty input', () => {
      const plaintext = 'myPassword123';
      const encrypted = credentialService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      // Verify it's valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('should return empty string for empty input', () => {
      const encrypted = credentialService.encrypt('');
      expect(encrypted).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = credentialService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('decrypt', () => {
    it('should return original plaintext after encrypt', () => {
      const plaintext = 'mySecretPassword';
      const encrypted = credentialService.encrypt(plaintext);
      const decrypted = credentialService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string for empty input', () => {
      const decrypted = credentialService.decrypt('');
      expect(decrypted).toBe('');
    });

    it('should handle special characters in round-trip', () => {
      const plaintext = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = credentialService.encrypt(plaintext);
      const decrypted = credentialService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should correctly round-trip various password types', () => {
      const passwords = [
        'simple',
        'with spaces',
        'with123numbers',
        'WithCAPS',
        '!@#$%^&*()',
        'unicode: 你好世界',
        'verylongpassword'.repeat(10),
      ];

      passwords.forEach((password) => {
        const encrypted = credentialService.encrypt(password);
        const decrypted = credentialService.decrypt(encrypted);
        expect(decrypted).toBe(password);
      });
    });
  });
});
