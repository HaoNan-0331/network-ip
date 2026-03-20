<template>
  <div class="settings-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 定时任务设置 -->
        <el-tab-pane label="定时采集" name="scheduler">
          <el-form label-width="120px">
            <el-form-item label="启用定时采集">
              <el-switch v-model="scheduleConfig.enabled" @change="handleScheduleChange" />
            </el-form-item>
            <el-form-item label="采集间隔">
              <el-select v-model="scheduleConfig.intervalMinutes" @change="handleScheduleChange" :disabled="!scheduleConfig.enabled">
                <el-option :value="5" label="5 分钟" />
                <el-option :value="10" label="10 分钟" />
                <el-option :value="15" label="15 分钟" />
                <el-option :value="30" label="30 分钟" />
                <el-option :value="60" label="1 小时" />
                <el-option :value="120" label="2 小时" />
                <el-option :value="360" label="6 小时" />
                <el-option :value="720" label="12 小时" />
                <el-option :value="1440" label="24 小时" />
              </el-select>
            </el-form-item>
            <el-form-item label="上次运行">
              <span>{{ scheduleConfig.lastRun ? formatTime(scheduleConfig.lastRun) : '从未运行' }}</span>
            </el-form-item>
            <el-form-item label="下次运行">
              <span>{{ scheduleConfig.nextRun ? formatTime(scheduleConfig.nextRun) : '-' }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleRunNow" :loading="runningTask">
                {{ runningTask ? '采集中...' : '立即采集' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 数据库管理 -->
        <el-tab-pane label="数据库" name="database">
          <el-form label-width="120px">
            <el-form-item label="数据库路径">
              <el-input v-model="dbPath" readonly style="width: 300px">
                <template #append>
                  <el-button text @click="openDbFolder">
                    <el-icon><FolderOpened /></el-icon>
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="数据库大小">
              <span>{{ dbSize }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleBackup" :loading="backingUp">
                {{ backingUp ? '备份中...' : '备份数据库' }}
              </el-button>
              <el-button type="danger" @click="handleReset" :loading="resetting">
                {{ resetting ? '重置中...' : '重置数据库' }}
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert type="warning" :closable="false" show-icon style="margin-top: 16px">
            <template #title>
              <strong>注意：</strong>
            </template>
            <ul style="margin: 0; padding-left: 20px;">
              <li>备份数据库：导出当前数据到文件</li>
              <li>重置数据库：删除所有数据并重新初始化（不可恢复）</li>
            </ul>
          </el-alert>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { FolderOpened } from '@element-plus/icons-vue';
import type { ScheduleConfig, SchedulerStatus } from '../../../shared/types/scheduler';

const activeTab = ref('scheduler');
const scheduleConfig = reactive<ScheduleConfig>({
  id: 1,
  enabled: false,
  intervalMinutes: 60,
  lastRun: null,
  nextRun: null,
});

const schedulerStatus = ref<SchedulerStatus>({
  isRunning: false,
  isTaskRunning: false,
  config: scheduleConfig,
});

const runningTask = ref(false);
const backingUp = ref(false);
const resetting = ref(false);
const dbPath = ref('');
const dbSize = ref('');

onMounted(async () => {
  await loadSchedulerStatus();
  await loadDbInfo();
});

async function loadSchedulerStatus() {
  try {
    const status = await window.electronAPI.scheduler.getStatus();
    Object.assign(scheduleConfig, status.config);
    schedulerStatus.value = status;
  } catch (error) {
    ElMessage.error(`加载定时任务状态失败: ${(error as Error).message}`);
  }
}

async function handleScheduleChange() {
  try {
    const result = await window.electronAPI.scheduler.updateConfig({
      enabled: scheduleConfig.enabled,
      intervalMinutes: scheduleConfig.intervalMinutes,
    });
    Object.assign(scheduleConfig, result);
    ElMessage.success('设置已保存');
  } catch (error) {
    ElMessage.error(`保存设置失败: ${(error as Error).message}`);
  }
}

async function handleRunNow() {
  runningTask.value = true;
  try {
    const result = await window.electronAPI.scheduler.runNow();
    if (result.success) {
      ElMessage.success(result.message);
      await loadSchedulerStatus();
    } else {
    ElMessage.warning(result.message);
  }
  } catch (error) {
    ElMessage.error(`采集失败: ${(error as Error).message}`);
  } finally {
    runningTask.value = false;
  }
}

async function loadDbInfo() {
  try {
    // 获取数据库路径和大小（需要添加 IPC）
    dbPath.value = await window.electronAPI.settings.getDbPath();
    dbSize.value = await window.electronAPI.settings.getDbSize();
  } catch (error) {
    console.error('Failed to load DB info:', error);
  }
}

function openDbFolder() {
  // 打开数据库所在目录
  window.electronAPI.settings.openDbFolder();
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN');
}

async function handleBackup() {
  backingUp.value = true;
  try {
    const result = await window.electronAPI.settings.backup();
    if (result) {
    ElMessage.success(`备份成功: ${result}`);
    await loadDbInfo();
  }
  } catch (error) {
    ElMessage.error(`备份失败: ${(error as Error).message}`);
  } finally {
    backingUp.value = false;
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '此操作将删除所有数据（设备、ARP记录、网段等），且无法恢复！',
      '确认重置数据库',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    resetting.value = true;
    await window.electronAPI.settings.reset();
    ElMessage.success('数据库已重置');
    await loadDbInfo();
  } catch {
    // User cancelled
  } finally {
    resetting.value = false;
  }
}

</script>

<style scoped>
.settings-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
