import { ipcMain } from 'electron';
import { AnomalyService } from '../services/anomalyService';
import type { IPMACChange, ChangeStats, ExcludedIP, CreateExcludedIPInput } from '../../shared/types/anomaly';

export function registerAnomalyHandlers(): void {
  /**
   * 获取变化事件列表
   */
  ipcMain.handle('anomaly:getChanges', async (_, unacknowledgedOnly: boolean = false, limit: number = 100): Promise<IPMACChange[]> => {
    console.log(`[IPC] Getting anomaly changes, unacknowledgedOnly: ${unacknowledgedOnly}`);
    return AnomalyService.getChanges(unacknowledgedOnly, limit);
  });

  /**
   * 确认变化事件
   */
  ipcMain.handle('anomaly:acknowledge', async (_, id: number, notes?: string): Promise<void> => {
    console.log(`[IPC] Acknowledging change: ${id}`);
    AnomalyService.acknowledgeChange(id, notes);
  });

  /**
   * 批量确认所有变化
   */
  ipcMain.handle('anomaly:acknowledgeAll', async (): Promise<number> => {
    console.log('[IPC] Acknowledging all changes');
    return AnomalyService.acknowledgeAll();
  });

  /**
   * 删除单个变化事件
   */
  ipcMain.handle('anomaly:deleteChange', async (_, id: number): Promise<void> => {
    console.log(`[IPC] Deleting change: ${id}`);
    AnomalyService.deleteChange(id);
  });

  /**
   * 批量删除变化事件
   */
  ipcMain.handle('anomaly:deleteChanges', async (_, ids: number[]): Promise<number> => {
    console.log(`[IPC] Batch deleting ${ids.length} changes`);
    return AnomalyService.deleteChanges(ids);
  });

  /**
   * 获取变化统计
   */
  ipcMain.handle('anomaly:getStats', async (): Promise<ChangeStats> => {
    console.log('[IPC] Getting anomaly stats');
    return AnomalyService.getStats();
  });

  /**
   * 获取 IP 绑定历史
   */
  ipcMain.handle('anomaly:getBindingHistory', async (_, ip: string): Promise<any[]> => {
    console.log(`[IPC] Getting binding history for: ${ip}`);
    return AnomalyService.getBindingHistory(ip);
  });

  // ============ 排除IP管理 ============

  /**
   * 获取所有排除规则
   */
  ipcMain.handle('anomaly:getExcludedIPs', async (): Promise<ExcludedIP[]> => {
    console.log('[IPC] Getting excluded IPs');
    return AnomalyService.getExcludedIPs();
  });

  /**
   * 添加排除规则
   */
  ipcMain.handle('anomaly:addExcludedIP', async (_, input: CreateExcludedIPInput): Promise<ExcludedIP> => {
    console.log('[IPC] Adding excluded IP:', input.ipOrCidr);
    return AnomalyService.addExcludedIP(input);
  });

  /**
   * 删除排除规则
   */
  ipcMain.handle('anomaly:deleteExcludedIP', async (_, id: number): Promise<void> => {
    console.log(`[IPC] Deleting excluded IP: ${id}`);
    AnomalyService.deleteExcludedIP(id);
  });

  /**
   * 检查 IP 是否被排除
   */
  ipcMain.handle('anomaly:checkIPExcluded', async (_, ip: string): Promise<boolean> => {
    return AnomalyService.checkIPExcluded(ip);
  });
}
