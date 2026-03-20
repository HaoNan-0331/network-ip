import { ipcMain } from 'electron';
import { ExportService } from '../services/exportService';

export function registerExportHandlers(): void {
  /**
   * 导出 ARP 表
   */
  ipcMain.handle('export:arpTable', async (): Promise<string | null> => {
    console.log('[IPC] Exporting ARP table');
    return ExportService.exportARPTable();
  });

  /**
   * 导出变化事件
   */
  ipcMain.handle('export:changes', async (_, unacknowledgedOnly: boolean = false): Promise<string | null> => {
    console.log(`[IPC] Exporting changes, unacknowledgedOnly: ${unacknowledgedOnly}`);
    return ExportService.exportChanges(unacknowledgedOnly);
  });

  /**
   * 导出网段使用情况
   */
  ipcMain.handle('export:networkUsage', async (_, networkId?: number): Promise<string | null> => {
    console.log(`[IPC] Exporting network usage for: ${networkId || 'all'}`);
    return ExportService.exportNetworkUsage(networkId);
  });
}
