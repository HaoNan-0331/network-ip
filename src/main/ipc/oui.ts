import { ipcMain } from 'electron';
import { OUIService } from '../services/ouiService';
import type { CreateOUIInput, UpdateOUIInput } from '../../shared/types/oui';

export function registerOUIHandlers(): void {
  // 获取所有 OUI 条目
  ipcMain.handle('oui:getAll', async () => {
    return OUIService.getAll();
  });

  // 搜索 OUI 条目
  ipcMain.handle('oui:search', async (_, keyword: string) => {
    return OUIService.search(keyword);
  });

  // 获取单个 OUI 条目
  ipcMain.handle('oui:getById', async (_, id: number) => {
    return OUIService.getById(id);
  });

  // 添加 OUI 条目
  ipcMain.handle('oui:add', async (_, input: CreateOUIInput) => {
    return OUIService.add(input);
  });

  // 批量添加 OUI 条目
  ipcMain.handle('oui:addBatch', async (_, entries: CreateOUIInput[]) => {
    return OUIService.addBatch(entries);
  });

  // 更新 OUI 条目
  ipcMain.handle('oui:update', async (_, input: UpdateOUIInput) => {
    return OUIService.update(input);
  });

  // 删除 OUI 条目
  ipcMain.handle('oui:delete', async (_, id: number) => {
    return OUIService.delete(id);
  });

  // 批量删除 OUI 条目
  ipcMain.handle('oui:deleteBatch', async (_, ids: number[]) => {
    return OUIService.deleteBatch(ids);
  });

  // 根据 MAC 地址查询厂商
  ipcMain.handle('oui:getVendor', async (_, mac: string) => {
    return OUIService.getVendor(mac);
  });

  // 获取所有厂商列表
  ipcMain.handle('oui:getAllVendors', async () => {
    return OUIService.getAllVendors();
  });

  // 获取统计信息
  ipcMain.handle('oui:getStats', async () => {
    return OUIService.getStats();
  });

  console.log('[IPC] OUI handlers registered');
}
