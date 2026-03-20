import { ipcMain } from 'electron';
import { NetworkSegmentService } from '../services/networkSegment';
import type { NetworkSegment, IPUsage, IPDetail, CreateNetworkInput, UpdateNetworkInput } from '../../shared/types/network';

export function registerNetworkHandlers(): void {
  /**
   * 获取所有网段
   */
  ipcMain.handle('network:getAll', async (): Promise<NetworkSegment[]> => {
    console.log('[IPC] Getting all network segments');
    return NetworkSegmentService.getAll();
  });

  /**
   * 根据ID获取网段
   */
  ipcMain.handle('network:getById', async (_, id: number): Promise<NetworkSegment | null> => {
    console.log(`[IPC] Getting network segment by id: ${id}`);
    return NetworkSegmentService.getById(id);
  });

  /**
   * 创建网段
   */
  ipcMain.handle('network:create', async (_, input: CreateNetworkInput): Promise<NetworkSegment> => {
    console.log('[IPC] Creating network segment:', input.name);
    return NetworkSegmentService.create(input);
  });

  /**
   * 更新网段
   */
  ipcMain.handle('network:update', async (_, input: UpdateNetworkInput): Promise<NetworkSegment | null> => {
    console.log(`[IPC] Updating network segment: ${input.id}`);
    return NetworkSegmentService.update(input);
  });

  /**
   * 删除网段
   */
  ipcMain.handle('network:delete', async (_, id: number): Promise<void> => {
    console.log(`[IPC] Deleting network segment: ${id}`);
    NetworkSegmentService.delete(id);
  });

  /**
   * 自动发现网段
   */
  ipcMain.handle('network:autoDiscover', async (): Promise<NetworkSegment[]> => {
    console.log('[IPC] Auto-discovering network segments');
    return NetworkSegmentService.autoDiscover();
  });

  /**
   * 获取网段IP使用统计
   */
  ipcMain.handle('network:getIPUsage', async (_, networkId: number): Promise<IPUsage> => {
    console.log(`[IPC] Getting IP usage for network: ${networkId}`);
    return NetworkSegmentService.getIPUsage(networkId);
  });

  /**
   * 获取网段IP详情列表
   */
  ipcMain.handle('network:getIPDetails', async (
    _,
    networkId: number,
    searchIp?: string,
    searchMac?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<IPDetail[]> => {
    console.log(`[IPC] Getting IP details for network: ${networkId}, searchIp: ${searchIp}, searchMac: ${searchMac}`);
    return NetworkSegmentService.getIPDetails(networkId, searchIp, searchMac, sortBy, sortOrder);
  });
}
