<template>
  <div class="arp-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>ARP 数据采集</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleScanAll" :loading="scanning">
              {{ scanning ? '采集中...' : '全部采集' }}
            </el-button>
            <el-button @click="handleExport" :loading="exporting">
              导出CSV
            </el-button>
            <el-button @click="handleRefresh">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- 采集进度 -->
      <div v-if="scanning" class="scan-progress">
        <el-progress
          :percentage="scanProgress"
          :format="() => `${completedDevices}/${totalDevices} 设备`"
        />
        <p v-if="currentDevice">正在采集: {{ currentDevice }}</p>
      </div>

      <!-- 采集结果统计 -->
      <div v-if="results.length > 0" class="result-summary">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="已采集设备" :value="successfulDevices" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="失败设备" :value="failedDevices" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总 ARP 条目" :value="totalEntries" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="唯一 IP 数" :value="uniqueIPs" />
          </el-col>
        </el-row>
      </div>

      <!-- 设备采集结果列表 -->
      <div v-if="results.length > 0" class="results-list">
        <el-divider content-position="left">采集结果</el-divider>
        <el-collapse>
          <el-collapse-item
            v-for="result in results"
            :key="result.deviceId"
            :name="result.deviceId"
          >
            <template #title>
              <div class="result-title">
                <el-tag :type="result.error ? 'danger' : 'success'" size="small">
                  {{ result.error ? '失败' : '成功' }}
                </el-tag>
                <span class="device-name">{{ result.deviceName }} ({{ result.deviceIp }})</span>
                <span class="entry-count">{{ result.entries.length }} 条</span>
              </div>
            </template>

            <!-- ARP 条目表格 -->
            <el-table
              v-if="result.entries.length > 0"
              :data="result.entries"
              size="small"
              max-height="300"
            >
              <el-table-column prop="ip" label="IP 地址" width="140" />
              <el-table-column prop="mac" label="MAC 地址" width="150" />
              <el-table-column prop="vlan" label="VLAN" width="80" />
              <el-table-column prop="interface" label="接口" min-width="120" />
              <el-table-column prop="type" label="类型" width="80" />
            </el-table>

            <!-- 错误信息 -->
            <el-alert
              v-if="result.error"
              :title="result.error"
              type="error"
              :closable="false"
              show-icon
            />
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!scanning && results.length === 0" description="点击全部采集开始采集 ARP 数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import type { ARPCollectionResult } from '../../../shared/types/arp';

const scanning = ref(false);
const exporting = ref(false);
const results = ref<ARPCollectionResult[]>([]);
const currentDevice = ref<string>('');
const completedDevices = ref(0);
const totalDevices = ref(0);

const scanProgress = computed(() => {
  if (totalDevices.value === 0) return 0;
  return Math.round((completedDevices.value / totalDevices.value) * 100);
});

const successfulDevices = computed(() =>
  results.value.filter((r) => !r.error).length
);

const failedDevices = computed(() =>
  results.value.filter((r) => r.error).length
);

const totalEntries = computed(() =>
  results.value.reduce((sum, r) => sum + r.entries.length, 0)
);

const uniqueIPs = computed(() => {
  const ips = new Set<string>();
  results.value.forEach((r) => {
    r.entries.forEach((e) => ips.add(e.ip));
  });
  return ips.size;
});

async function handleScanAll() {
  if (scanning.value) return;

  scanning.value = true;
  results.value = [];
  completedDevices.value = 0;
  currentDevice.value = '';

  try {
    ElMessage.info('开始采集 ARP 数据...');
    const collectionResults = await window.electronAPI.arp.collectFromAll();
    results.value = collectionResults;
    totalDevices.value = collectionResults.length;
    completedDevices.value = collectionResults.length;

    if (successfulDevices.value > 0) {
      ElMessage.success(`采集完成: ${successfulDevices.value} 台设备成功, ${totalEntries.value} 条 ARP 记录`);
    } else {
      ElMessage.warning('所有设备采集失败');
    }
  } catch (error) {
    ElMessage.error(`采集失败: ${(error as Error).message}`);
  } finally {
    scanning.value = false;
    currentDevice.value = '';
  }
}

async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;

  try {
    const filePath = await window.electronAPI.export.arpTable();
    if (filePath) {
      ElMessage.success(`导出成功: ${filePath}`);
    }
  } catch (error) {
    ElMessage.error(`导出失败: ${(error as Error).message}`);
  } finally {
    exporting.value = false;
  }
}

function handleRefresh() {
  results.value = [];
}
</script>

<style scoped>
.arp-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.scan-progress {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.scan-progress p {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

.result-summary {
  margin-bottom: 20px;
  padding: 16px 0;
}

.results-list {
  margin-top: 16px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-name {
  font-weight: 500;
}

.entry-count {
  color: #909399;
  font-size: 13px;
}
</style>
