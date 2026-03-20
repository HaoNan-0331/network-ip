import { ipcMain } from 'electron';
import { getDatabase } from '../services/database';
import { CredentialService } from '../services/credential';
import { SSHService } from '../services/ssh';
import { TelnetService } from '../services/telnet';
import type { Device, CreateDeviceInput, UpdateDeviceInput, ConnectionTestResult } from '../../shared/types/device';

const credentialService = new CredentialService();

export function registerDeviceHandlers(): void {
  ipcMain.handle('devices:getAll', async (): Promise<Device[]> => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, name, ip, vendor, protocol, port, username,
             encrypted_password as encryptedPassword,
             status, last_checked as lastChecked,
             created_at as createdAt, updated_at as updatedAt
      FROM devices
      ORDER BY created_at DESC
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      encryptedPassword: row.encryptedPassword,
    }));
  });

  ipcMain.handle('devices:create', async (_, input: CreateDeviceInput): Promise<Device> => {
    const db = getDatabase();
    const encryptedPassword = credentialService.encrypt(input.password);

    const result = db.prepare(`
      INSERT INTO devices (name, ip, vendor, protocol, port, username, encrypted_password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.name, input.ip, input.vendor, input.protocol, input.port, input.username, encryptedPassword);

    return {
      id: result.lastInsertRowid as number,
      name: input.name,
      ip: input.ip,
      vendor: input.vendor,
      protocol: input.protocol,
      port: input.port,
      username: input.username,
      encryptedPassword,
      status: 'unknown',
      lastChecked: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  ipcMain.handle('devices:update', async (_, input: UpdateDeviceInput): Promise<Device> => {
    const db = getDatabase();
    const { id, password, ...updates } = input;

    let encryptedPassword: string | undefined;
    if (password !== undefined && password !== '') {
      encryptedPassword = credentialService.encrypt(password);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (encryptedPassword) {
      setClauses.push('encrypted_password = ?');
      values.push(encryptedPassword);
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`
      UPDATE devices SET ${setClauses.join(', ')} WHERE id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as any;
    return {
      ...updated,
      encryptedPassword: updated.encrypted_password,
      lastChecked: updated.last_checked,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  });

  ipcMain.handle('devices:delete', async (_, id: number): Promise<void> => {
    const db = getDatabase();
    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  });

  ipcMain.handle('devices:testConnection', async (_, id: number): Promise<ConnectionTestResult> => {
    console.log(`[IPC] testConnection called for device id: ${id}`);
    const db = getDatabase();
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as any;

    if (!device) {
      console.error('[IPC] Device not found:', id);
      return { success: false, error: 'Device not found' };
    }

    console.log(`[IPC] Device info: ${device.name} (${device.ip}:${device.port}) via ${device.protocol}`);
    const password = credentialService.decrypt(device.encrypted_password);
    console.log(`[IPC] Password decrypted, length: ${password.length}`);

    try {
      if (device.protocol === 'ssh') {
        console.log('[IPC] Creating SSH service...');
        const sshService = new SSHService({
          host: device.ip,
          port: device.port,
          username: device.username,
          password,
          timeout: 15000,
        });

        console.log('[IPC] Calling ssh.connect()...');
        const ssh = await sshService.connect();
        console.log('[IPC] SSH connected, now disconnecting...');
        await sshService.disconnect(ssh);
        console.log('[IPC] SSH disconnected');
      } else {
        console.log('[IPC] Creating Telnet service...');
        const telnetService = new TelnetService({
          host: device.ip,
          port: device.port,
          username: device.username,
          password,
          timeout: 15000,
        });

        console.log('[IPC] Calling telnet.connect()...');
        const conn = await telnetService.connect();
        console.log('[IPC] Telnet connected, now disconnecting...');
        await telnetService.disconnect(conn);
        console.log('[IPC] Telnet disconnected');
      }

      console.log(`[IPC] Connection test SUCCESS: ${device.name}`);
      db.prepare(`
        UPDATE devices SET status = 'online', last_checked = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id);

      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[IPC] Connection test FAILED: ${device.name}`, errMsg);
      db.prepare(`
        UPDATE devices SET status = 'offline', last_checked = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id);

      return { success: false, error: errMsg };
    }
  });
}
