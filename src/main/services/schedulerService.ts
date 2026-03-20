import { BrowserWindow } from 'electron';
import { getDatabase } from './database';
import { ARPCollector } from './arpCollector';
import { AnomalyService } from './anomalyService';
import { IPStatusService } from './ipStatusService';

/**
 * 定时任务配置
 */
export interface ScheduleConfig {
  id: number;
  enabled: boolean;
  intervalMinutes: number;
  lastRun: string | null;
  nextRun: string | null;
}

/**
 * 定时任务服务
 */
export class SchedulerService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;

  /**
   * 启动定时任务
   */
  static start(): void {
    if (this.intervalId) {
      console.log('[Scheduler] Already running');
      return;
    }

    const config = this.getConfig();

    if (!config.enabled) {
      console.log('[Scheduler] Scheduler is disabled');
      return;
    }

    const intervalMinutes = config.intervalMinutes ?? 60;
    console.log(`[Scheduler] Starting scheduler with ${intervalMinutes} minute interval`);

    // 计算下次运行时间
    this.updateNextRun(intervalMinutes);

    // 设置定时器
    this.intervalId = setInterval(async () => {
      await this.runTask();
    }, intervalMinutes * 60 * 1000);

    // 如果上次运行时间超过间隔，立即运行一次
    if (this.shouldRunNow(config)) {
      this.runTask();
    }
  }

  /**
   * 停止定时任务
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Stopped');
    }
  }

  /**
   * 重启定时任务（配置变更后）
   */
  static restart(): void {
    this.stop();
    this.start();
  }

  /**
   * 手动触发一次采集
   */
  static async runNow(): Promise<{ success: boolean; message: string; stats?: any }> {
    if (this.isRunning) {
      return { success: false, message: '任务正在运行中' };
    }

    try {
      const result = await this.executeTask();
      return { success: true, message: '采集完成', stats: result };
    } catch (error) {
      return { success: false, message: `采集失败: ${(error as Error).message}` };
    }
  }

  /**
   * 执行定时任务
   */
  private static async runTask(): Promise<void> {
    if (this.isRunning) {
      console.log('[Scheduler] Task already running, skipping');
      return;
    }

    console.log('[Scheduler] Running scheduled task...');

    try {
      await this.executeTask();
      this.updateLastRun();
      const config = this.getConfig();
      this.updateNextRun(config.intervalMinutes);
    } catch (error) {
      console.error('[Scheduler] Task failed:', error);
    }
  }

  /**
   * 执行采集任务
   */
  private static async executeTask(): Promise<{
    devices: number;
    entries: number;
    changes: number;
  }> {
    this.isRunning = true;

    try {
      // 开始采集周期
      const collectionTime = IPStatusService.beginCollection();
      console.log(`[Scheduler] Collection started at: ${collectionTime}`);

      // 1. 采集所有设备的 ARP 数据
      const results = await ARPCollector.collectFromAll();
      const db = getDatabase();

      // 2. 处理 ARP 数据并检测变化
      let totalEntries = 0;
      let totalChanges = 0;

      for (const result of results) {
        if (result.error) {
          console.error(`[Scheduler] Failed to collect from ${result.deviceName}: ${result.error}`);
          continue;
        }

        if (result.entries.length > 0) {
          totalEntries += result.entries.length;

          // 保存 ARP 条目到数据库
          const stmt = db.prepare(`
            INSERT INTO arp_entries (device_id, ip, mac, vlan, interface, collected_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          for (const entry of result.entries) {
            try {
              stmt.run(
                result.deviceId,
                entry.ip,
                entry.mac,
                entry.vlan || null,
                entry.interface || null,
                result.collectedAt
              );
            } catch {
              // 忽略重复条目错误
            }
          }

          // 更新 IP 状态（标记为已用）
          IPStatusService.batchUpdateIPStatus(
            result.entries.map(e => ({ ip: e.ip, mac: e.mac })),
            collectionTime
          );

          // 检测 IP-MAC 变化
          const changes = AnomalyService.processARPEntries(result.entries);
          totalChanges += changes.length;
        }
      }

      // 3. 结束采集周期 - 将未采集到的IP标记为弃用
      const deprecatedCount = IPStatusService.endCollection(collectionTime);
      console.log(`[Scheduler] Marked ${deprecatedCount} IPs as deprecated`);

      // 4. 通知渲染进程更新
      this.notifyRenderer('task-completed', {
        devices: results.length,
        entries: totalEntries,
        changes: totalChanges,
        deprecated: deprecatedCount,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Scheduler] Task completed: ${results.length} devices, ${totalEntries} entries, ${totalChanges} changes, ${deprecatedCount} deprecated`);

      return {
        devices: results.length,
        entries: totalEntries,
        changes: totalChanges,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 检查是否应该立即运行
   */
  private static shouldRunNow(config: ScheduleConfig): boolean {
    if (!config.lastRun) return true;

    try {
      const lastRun = new Date(config.lastRun);
      const now = new Date();
      const elapsed = now.getTime() - lastRun.getTime();
      const intervalMs = (config.intervalMinutes ?? 60) * 60 * 1000;

      return elapsed >= intervalMs;
    } catch {
      return true;
    }
  }

  /**
   * 获取配置
   */
  static getConfig(): ScheduleConfig {
    const db = getDatabase();

    // 确保配置存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheduler_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 0,
        interval_minutes INTEGER NOT NULL DEFAULT 60,
        last_run DATETIME,
        next_run DATETIME
      )
    `);

    const row = db.prepare('SELECT * FROM scheduler_config WHERE id = 1').get() as any;

    if (!row) {
      db.prepare(`
        INSERT INTO scheduler_config (id, enabled, interval_minutes)
        VALUES (1, 0, 60)
      `).run();

      return {
        id: 1,
        enabled: false,
        intervalMinutes: 60,
        lastRun: null,
        nextRun: null,
      };
    }

    // 映射数据库字段到接口
    return {
      id: row.id,
      enabled: Boolean(row.enabled),
      intervalMinutes: row.interval_minutes ?? 60,
      lastRun: row.last_run,
      nextRun: row.next_run,
    };
  }

  /**
   * 更新配置
   */
  static updateConfig(updates: { enabled?: boolean; intervalMinutes?: number }): ScheduleConfig {
    const db = getDatabase();
    const config = this.getConfig();

    const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (config.enabled ? 1 : 0);
    const intervalMinutes = updates.intervalMinutes ?? config.intervalMinutes ?? 60;

    db.prepare(`
      UPDATE scheduler_config
      SET enabled = ?, interval_minutes = ?
      WHERE id = 1
    `).run(enabled, intervalMinutes);

    // 重启定时器
    this.restart();

    return this.getConfig();
  }

  /**
   * 更新最后运行时间
   */
  private static updateLastRun(): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE scheduler_config SET last_run = CURRENT_TIMESTAMP WHERE id = 1
    `).run();
  }

  /**
   * 更新下次运行时间
   */
  private static updateNextRun(intervalMinutes: number): void {
    const db = getDatabase();
    const minutes = intervalMinutes ?? 60;
    const nextRun = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE scheduler_config SET next_run = ? WHERE id = 1
    `).run(nextRun);
  }

  /**
   * 通知渲染进程
   */
  private static notifyRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(channel, data);
    }
  }

  /**
   * 获取运行状态
   */
  static getStatus(): {
    isRunning: boolean;
    isTaskRunning: boolean;
    config: ScheduleConfig;
  } {
    return {
      isRunning: this.intervalId !== null,
      isTaskRunning: this.isRunning,
      config: this.getConfig(),
    };
  }
}
