import { ipcMain } from 'electron';
import { SchedulerService } from '../services/schedulerService';

export function registerSchedulerHandlers(): void {
  // 获取定时任务配置
  ipcMain.handle('scheduler:getConfig', async () => {
    return SchedulerService.getConfig();
  });

  // 更新定时任务配置
  ipcMain.handle('scheduler:updateConfig', async (_, updates: { enabled?: boolean; intervalMinutes?: number }) => {
    return SchedulerService.updateConfig(updates);
  });

  // 手动触发采集
  ipcMain.handle('scheduler:runNow', async () => {
    return SchedulerService.runNow();
  });

  // 获取运行状态
  ipcMain.handle('scheduler:getStatus', async () => {
    return SchedulerService.getStatus();
  });

  console.log('[IPC] Scheduler handlers registered');
}
