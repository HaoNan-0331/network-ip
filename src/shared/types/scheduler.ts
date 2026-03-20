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
 * 定时任务状态
 */
export interface SchedulerStatus {
  isRunning: boolean;
  isTaskRunning: boolean;
  config: ScheduleConfig;
}

/**
 * 更新定时任务配置
 */
export interface UpdateScheduleInput {
  enabled?: boolean;
  intervalMinutes?: number;
}
