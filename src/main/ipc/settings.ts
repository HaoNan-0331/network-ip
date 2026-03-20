import { ipcMain, dialog, shell, app } from 'electron';
import { getDatabase, resetDatabase, initDatabase } from '../services/database';
import { statSync, copyFileSync, unlinkSync, existsSync } from 'fs';
import { dirname } from 'path';
import path from 'path';

function getDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

export function registerSettingsHandlers(): void {
  // 获取数据库路径
  ipcMain.handle('settings:getDbPath', async () => {
    const db = getDatabase();
    return db.name;
  });

  // 获取数据库大小
  ipcMain.handle('settings:getDbSize', async () => {
    try {
      const db = getDatabase();
      const stats = statSync(db.name);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      return `${sizeMB} MB`;
    } catch {
      return '未知';
    }
  });

  // 打开数据库所在目录
  ipcMain.handle('settings:openDbFolder', async () => {
    const db = getDatabase();
    const dbDir = dirname(db.name);
    shell.openPath(dbDir);
  });

  // 备份数据库
  ipcMain.handle('settings:backup', async () => {
    const db = getDatabase();
    const dbPath = db.name;

    const result = await dialog.showSaveDialog({
      title: '备份数据库',
      defaultPath: `network-ip-backup-${getDateString()}.db`,
      filters: [
        { name: 'SQLite 数据库', extensions: ['db'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    try {
      // 确保数据库写入磁盘
      db.pragma('wal_checkpoint(TRUNCATE)');

      // 复制数据库文件
      copyFileSync(dbPath, result.filePath);

      return result.filePath;
    } catch (error) {
      throw new Error(`备份失败: ${(error as Error).message}`);
    }
  });

  // 重置数据库（删除所有数据）
  ipcMain.handle('settings:reset', async () => {
    const confirm = await dialog.showMessageBox({
      type: 'warning',
      title: '确认重置',
      message: '确定要重置数据库吗？',
      detail: '此操作将删除所有数据（设备、ARP记录、网段等），且无法恢复！',
      buttons: ['取消', '确认重置'],
      defaultId: 0,
      cancelId: 0,
    });

    if (confirm.response !== 1) {
      return false;
    }

    try {
      const dbPath = path.join(app.getPath('userData'), 'network-ip.db');
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';

      // 重置数据库连接
      resetDatabase();

      // 删除数据库文件
      if (existsSync(dbPath)) {
        unlinkSync(dbPath);
      }
      if (existsSync(walPath)) {
        unlinkSync(walPath);
      }
      if (existsSync(shmPath)) {
        unlinkSync(shmPath);
      }

      // 重新初始化数据库
      initDatabase();

      return true;
    } catch (error) {
      throw new Error(`重置失败: ${(error as Error).message}`);
    }
  });

  console.log('[IPC] Settings handlers registered');
}
