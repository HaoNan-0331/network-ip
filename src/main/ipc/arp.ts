import { ipcMain } from 'electron';
import { getDatabase } from '../services/database';
import { CredentialService } from '../services/credential';
import { ARPCollector, type DeviceInfo } from '../services/arpCollector';
import { AnomalyService } from '../services/anomalyService';
import { IPStatusService } from '../services/ipStatusService';
import type { ARPCollectionResult, ARPScanProgress } from '../../shared/types/arp';

const credentialService = new CredentialService();

export function registerARPHandlers(): void {
  /**
   * 从单个设备采集 ARP 表
   */
  ipcMain.handle('arp:collectFromDevice', async (_, deviceId: number): Promise<ARPCollectionResult> => {
    console.log(`[IPC] ARP collect from device: ${deviceId}`);
    const db = getDatabase();
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as any;

    if (!device) {
      return {
        deviceId,
        deviceName: 'Unknown',
        deviceIp: 'Unknown',
        vendor: 'unknown',
        entries: [],
        collectedAt: new Date().toISOString(),
        error: 'Device not found',
      };
    }

    const password = credentialService.decrypt(device.encrypted_password);

    const collector = new ARPCollector();
    const deviceInfo: DeviceInfo = {
      id: device.id,
      name: device.name,
      ip: device.ip,
      vendor: device.vendor,
      protocol: device.protocol,
      port: device.port,
      username: device.username,
      password,
    };

    return collector.collectFromDevice(deviceInfo);
  });

  /**
   * 从所有设备并发采集 ARP 表
   */
  ipcMain.handle('arp:collectFromAll', async (): Promise<ARPCollectionResult[]> => {
    console.log('[IPC] ARP collect from all devices');
    const db = getDatabase();
    const devices = db.prepare('SELECT * FROM devices').all() as any[];

    if (devices.length === 0) {
      console.log('[IPC] No devices found');
      return [];
    }

    // 开始采集周期
    const collectionTime = IPStatusService.beginCollection();
    console.log(`[IPC] Collection started at: ${collectionTime}`);

    const collector = new ARPCollector({ concurrency: 3, timeout: 30000 });

    const deviceInfos: DeviceInfo[] = devices.map((device) => ({
      id: device.id,
      name: device.name,
      ip: device.ip,
      vendor: device.vendor,
      protocol: device.protocol,
      port: device.port,
      username: device.username,
      password: credentialService.decrypt(device.encrypted_password),
    }));

    // 发送进度更新
    const results = await collector.collectFromDevices(deviceInfos, (progress: ARPScanProgress) => {
      console.log(`[IPC] Progress: ${progress.completed}/${progress.total}`);
    });

    // 将采集结果存入数据库并更新IP状态
    for (const result of results) {
      if (result.entries.length > 0) {
        saveARPEntries(db, result, collectionTime);
      }
    }

    // 结束采集周期 - 将未采集到的IP标记为弃用
    const deprecatedCount = IPStatusService.endCollection(collectionTime);
    console.log(`[IPC] Marked ${deprecatedCount} IPs as deprecated`);

    console.log(`[IPC] ARP collection complete: ${results.length} devices, total entries: ${results.reduce((sum, r) => sum + r.entries.length, 0)}`);
    return results;
  });
}

/**
 * 保存 ARP 条目到数据库
 */
function saveARPEntries(db: any, result: ARPCollectionResult, collectionTime: string): void {
  const stmt = db.prepare(`
    INSERT INTO arp_entries (device_id, ip, mac, vlan, interface, collected_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const collectedAt = result.collectedAt;

  for (const entry of result.entries) {
    try {
      stmt.run(
        result.deviceId,
        entry.ip,
        entry.mac,
        entry.vlan || null,
        entry.interface || null,
        collectedAt
      );
    } catch (e) {
      // 忽略重复条目错误
    }
  }

  // 更新 IP 状态（标记为已用）
  if (result.entries.length > 0) {
    IPStatusService.batchUpdateIPStatus(
      result.entries.map(e => ({ ip: e.ip, mac: e.mac })),
      collectionTime
    );

    // 检测 IP-MAC 变化
    const changes = AnomalyService.processARPEntries(result.entries);
    if (changes.length > 0) {
      console.log(`[ARP] Detected ${changes.length} IP-MAC changes for device ${result.deviceName}`);
    }
  }
}
