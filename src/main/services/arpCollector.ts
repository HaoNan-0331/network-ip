import { SSHService } from './ssh';
import { TelnetService } from './telnet';
import { ARPParser } from './arpParser';
import { getDatabase } from './database';
import { CredentialService } from './credential';
import type { ARPEntry, ARPCollectionResult, ARPScanProgress } from '../../shared/types/arp';

export interface DeviceInfo {
  id: number;
  name: string;
  ip: string;
  vendor: string;
  protocol: string;
  port: number;
  username: string;
  password: string;
}

/**
 * ARP 数据采集服务
 */
/**
 * 获取所有设备
 */
async function getDevices(): Promise<DeviceInfo[]> {
  const db = getDatabase();
  const credentialService = new CredentialService();

  const rows = db.prepare(`
    SELECT id, name, ip, vendor, protocol, port, username, encrypted_password
    FROM devices
    ORDER BY name
  `).all() as any[];

  // 解密密码
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    ip: row.ip,
    vendor: row.vendor,
    protocol: row.protocol,
    port: row.port,
    username: row.username,
    password: credentialService.decrypt(row.encrypted_password),
  }));
}

export class ARPCollector {
  private concurrency: number;
  private timeout: number;

  constructor(options?: { concurrency?: number; timeout?: number }) {
    this.concurrency = options?.concurrency ?? 3;
    this.timeout = options?.timeout ?? 30000;
  }

  /**
   * 从单个设备采集 ARP 表
   */
  async collectFromDevice(device: DeviceInfo): Promise<ARPCollectionResult> {
    const result: ARPCollectionResult = {
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
      vendor: device.vendor,
      entries: [],
      collectedAt: new Date().toISOString(),
    };

    try {
      console.log(`[ARPCollector] Collecting ARP from ${device.name} (${device.ip})`);

      let output: string;

      if (device.protocol === 'ssh') {
        output = await this.collectViaSSH(device);
      } else {
        output = await this.collectViaTelnet(device);
      }

      console.log(`[ARPCollector] Raw output length: ${output.length}`);
      console.log(`[ARPCollector] Raw output preview: ${output.substring(0, 500)}`);

      // 解析 ARP 表
      result.entries = ARPParser.parse(output, device.vendor);
      console.log(`[ARPCollector] Parsed ${result.entries.length} ARP entries from ${device.name}`);
      console.log(`[ARPCollector] Parsed ${result.entries.length} ARP entries from ${device.name}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ARPCollector] Failed to collect from ${device.name}:`, errMsg);
      result.error = errMsg;
    }

    return result;
  }

  /**
   * 从多个设备并发采集 ARP 表
   */
  async collectFromDevices(
    devices: DeviceInfo[],
    onProgress?: (progress: ARPScanProgress) => void
  ): Promise<ARPCollectionResult[]> {
    const progress: ARPScanProgress = {
      total: devices.length,
      completed: 0,
      results: [],
    };

    const results: ARPCollectionResult[] = [];

    // 分批并发执行
    for (let i = 0; i < devices.length; i += this.concurrency) {
      const batch = devices.slice(i, i + this.concurrency);

      const batchResults = await Promise.all(
        batch.map(async (device) => {
          progress.current = device.name;
          onProgress?.(progress);

          const result = await this.collectFromDevice(device);

          progress.completed++;
          progress.results.push(result);
          onProgress?.(progress);

          return result;
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 通过 SSH 采集 ARP 表
   */
  private async collectViaSSH(device: DeviceInfo): Promise<string> {
    const sshService = new SSHService({
      host: device.ip,
      port: device.port,
      username: device.username,
      password: device.password,
      timeout: this.timeout,
    });

    const client = await sshService.connect();

    try {
      const command = this.getARPCommand(device.vendor);
      console.log(`[ARPCollector] Executing: ${command}`);
      const output = await sshService.executeCommand(client, command);
      return output;
    } finally {
      await sshService.disconnect(client);
    }
  }

  /**
   * 通过 Telnet 采集 ARP 表
   */
  private async collectViaTelnet(device: DeviceInfo): Promise<string> {
    const telnetService = new TelnetService({
      host: device.ip,
      port: device.port,
      username: device.username,
      password: device.password,
      timeout: this.timeout,
    });

    const conn = await telnetService.connect();

    try {
      const command = this.getARPCommand(device.vendor);
      console.log(`[ARPCollector] Executing: ${command}`);
      const output = await telnetService.executeCommand(conn, command);
      return output;
    } finally {
      await telnetService.disconnect(conn);
    }
  }

  /**
   * 获取对应厂商的 ARP 命令
   */
  private getARPCommand(vendor: string): string {
    switch (vendor.toLowerCase()) {
      case 'huawei':
      case 'h3c':
        return 'display arp all';
      case 'cisco':
      case 'ruijie':
        return 'show ip arp';
      default:
        return 'display arp all';
    }
  }

  /**
   * 采集所有设备的 ARP 数据
   */
  static async collectFromAll(): Promise<ARPCollectionResult[]> {
    const devices = await getDevices();
    if (devices.length === 0) {
      return [];
    }

    const collector = new ARPCollector();
    return collector.collectFromDevices(devices);
  }
}


