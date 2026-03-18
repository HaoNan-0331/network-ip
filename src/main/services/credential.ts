import { safeStorage } from 'electron';

export class CredentialService {
  private isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }
    if (!this.isEncryptionAvailable()) {
      // Fallback for Linux without keychain - base64 only (not secure)
      console.warn('Encryption not available, using base64 fallback');
      return Buffer.from(plaintext).toString('base64');
    }
    const encrypted = safeStorage.encryptString(plaintext);
    return encrypted.toString('base64');
  }

  decrypt(encryptedBase64: string): string {
    if (!encryptedBase64) {
      return '';
    }
    if (!this.isEncryptionAvailable()) {
      return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
    }
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  }
}
