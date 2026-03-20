<template>
  <div class="anomaly-management">
    <el-row :gutter="20">
      <!-- 统计卡片 -->
      <el-col :span="24">
        <el-row :gutter="16" class="stats-row">
          <el-col :span="4">
            <el-card shadow="hover">
              <el-statistic title="总事件数" :value="stats.total" />
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card shadow="hover">
              <el-statistic title="未确认" :value="stats.unacknowledged">
                <template #suffix>
                  <el-badge v-if="stats.unacknowledged > 0" type="danger" />
                </template>
              </el-statistic>
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card shadow="hover">
              <el-statistic title="MAC变化" :value="stats.macChanged" />
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card shadow="hover">
              <el-statistic title="新IP" :value="stats.newIp" />
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card shadow="hover">
              <el-statistic title="IP重用" :value="stats.ipReused" />
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card shadow="hover" class="action-card">
              <el-button type="primary" @click="handleAcknowledgeAll" :disabled="stats.unacknowledged === 0">
                全部确认
              </el-button>
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <!-- 排除IP管理 -->
      <el-col :span="24">
        <el-card class="excluded-ips-card">
          <template #header>
            <div class="card-header">
              <span>排除地址（不检测变化）</span>
              <div class="header-actions">
                <div v-if="selectedExcludedIPs.length > 0" class="batch-actions">
                  <el-tag type="info">已选 {{ selectedExcludedIPs.length }} 项</el-tag>
                  <el-button size="small" type="danger" @click="handleBatchDeleteExcluded">
                    批量删除
                  </el-button>
                </div>
                <el-input
                  v-model="excludedSearchKeyword"
                  placeholder="搜索IP/网段"
                  clearable
                  style="width: 180px"
                  @input="filterExcludedIPs"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button size="small" type="primary" @click="showAddExcludedDialog">
                  添加排除
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            ref="excludedTableRef"
            :data="filteredExcludedIPs"
            v-loading="loadingExcluded"
            size="small"
            max-height="200"
            @selection-change="handleExcludedSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="ipOrCidr" label="IP/网段" width="180">
              <template #default="{ row }">
                <el-tag>{{ row.ipOrCidr }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200">
              <template #default="{ row }">
                {{ row.description || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button size="small" type="danger" text @click="handleDeleteExcluded(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loadingExcluded && filteredExcludedIPs.length === 0" description="暂无排除规则" :image-size="60" />
        </el-card>
      </el-col>

      <!-- 事件列表 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>IP-MAC 变化事件</span>
              <div class="header-actions">
                <!-- 批量操作按钮 -->
                <div v-if="selectedChanges.length > 0" class="batch-actions">
                  <el-tag type="info">已选 {{ selectedChanges.length }} 项</el-tag>
                  <el-button size="small" type="primary" @click="handleBatchAcknowledge">
                    批量确认
                  </el-button>
                  <el-button size="small" type="warning" @click="handleBatchExclude">
                    批量排除
                  </el-button>
                  <el-button size="small" type="danger" @click="handleBatchDelete">
                    批量删除
                  </el-button>
                </div>
                <el-input
                  v-model="changeSearchKeyword"
                  placeholder="搜索IP/MAC"
                  clearable
                  style="width: 200px"
                  @input="filterChanges"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-switch v-model="showUnacknowledgedOnly" active-text="仅未确认" @change="loadChanges" />
                <el-button size="small" @click="handleExportChanges" :loading="exporting">
                  导出CSV
                </el-button>
                <el-button size="small" @click="loadChanges" :loading="loading">
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            ref="changesTableRef"
            :data="filteredChanges"
            v-loading="loading"
            size="small"
            max-height="500"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="ip" label="IP地址" width="140">
              <template #default="{ row }">
                {{ row.ip }}
                <el-tag v-if="isExcluded(row.ip)" type="info" size="small" style="margin-left: 4px">已排除</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="变化类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getChangeTypeTag(row.changeType)" size="small">
                  {{ getChangeTypeLabel(row.changeType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="oldMac" label="原MAC" width="150">
              <template #default="{ row }">
                {{ row.oldMac || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="newMac" label="新MAC" width="150">
              <template #default="{ row }">
                {{ row.newMac || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="detectedAt" label="检测时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.detectedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.acknowledged ? 'success' : 'warning'" size="small">
                  {{ row.acknowledged ? '已确认' : '待确认' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="notes" label="备注" min-width="120">
              <template #default="{ row }">
                {{ row.notes || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="!row.acknowledged"
                  size="small"
                  type="primary"
                  @click="handleAcknowledge(row)"
                >
                  确认
                </el-button>
                <el-button size="small" @click="showBindingHistory(row.ip)">
                  历史
                </el-button>
                <el-button
                  v-if="!isExcluded(row.ip)"
                  size="small"
                  type="warning"
                  @click="quickExclude(row.ip)"
                >
                  排除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 确认对话框 -->
    <el-dialog v-model="ackDialogVisible" title="确认事件" width="400px">
      <el-form>
        <el-form-item label="备注">
          <el-input v-model="ackNotes" type="textarea" :rows="3" placeholder="可选，记录处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAcknowledge">确认</el-button>
      </template>
    </el-dialog>

    <!-- 绑定历史对话框 -->
    <el-dialog v-model="historyDialogVisible" :title="`IP ${historyIp} 绑定历史`" width="600px">
      <el-table :data="bindingHistory" v-loading="loadingHistory" size="small">
        <el-table-column prop="mac" label="MAC地址" width="150" />
        <el-table-column prop="firstSeen" label="首次发现" width="160">
          <template #default="{ row }">
            {{ formatTime(row.firstSeen) }}
          </template>
        </el-table-column>
        <el-table-column prop="lastSeen" label="最后发现" width="160">
          <template #default="{ row }">
            {{ formatTime(row.lastSeen) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '活跃' : '历史' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 添加排除对话框 -->
    <el-dialog v-model="excludedDialogVisible" title="添加排除地址" width="450px">
      <el-form :model="excludedForm" :rules="excludedRules" ref="excludedFormRef" label-width="80px">
        <el-form-item label="IP/网段" prop="ipOrCidr">
          <el-input v-model="excludedForm.ipOrCidr" placeholder="如: 192.168.1.1 或 192.168.1.0/24 或 192.168.1.*" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="excludedForm.description" placeholder="可选，如: DHCP服务器" />
        </el-form-item>
      </el-form>
      <div class="format-tips">
        <p>支持格式：</p>
        <ul>
          <li>单个IP：192.168.1.1</li>
          <li>CIDR网段：192.168.1.0/24</li>
          <li>通配符：192.168.1.*</li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="excludedDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddExcluded">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import type { IPMACChange, ChangeStats, IPMACBinding, ExcludedIP, CreateExcludedIPInput } from '../../../shared/types/anomaly';

const changes = ref<IPMACChange[]>([]);
const stats = ref<ChangeStats>({ total: 0, unacknowledged: 0, macChanged: 0, newIp: 0, ipReused: 0 });
const bindingHistory = ref<IPMACBinding[]>([]);
const excludedIPs = ref<ExcludedIP[]>([]);
const loading = ref(false);
const loadingHistory = ref(false);
const loadingExcluded = ref(false);
const exporting = ref(false);
const showUnacknowledgedOnly = ref(true);
const ackDialogVisible = ref(false);
const historyDialogVisible = ref(false);
const excludedDialogVisible = ref(false);
const historyIp = ref('');
const ackNotes = ref('');
const selectedChange = ref<IPMACChange | null>(null);
const excludedFormRef = ref<FormInstance>();
const changesTableRef = ref();
const excludedTableRef = ref();
const selectedChanges = ref<IPMACChange[]>([]);
const selectedExcludedIPs = ref<ExcludedIP[]>([]);

// 搜索关键字
const changeSearchKeyword = ref('');
const excludedSearchKeyword = ref('');

const excludedForm = reactive<CreateExcludedIPInput>({
  ipOrCidr: '',
  description: '',
});

const excludedRules: FormRules = {
  ipOrCidr: [
    { required: true, message: '请输入IP或网段', trigger: 'blur' },
  ],
};

// 过滤后的变化列表
const filteredChanges = computed(() => {
  if (!changeSearchKeyword.value.trim()) {
    return changes.value;
  }
  const keyword = changeSearchKeyword.value.toLowerCase().trim();
  return changes.value.filter(change =>
    change.ip.toLowerCase().includes(keyword) ||
    (change.oldMac && change.oldMac.toLowerCase().includes(keyword)) ||
    (change.newMac && change.newMac.toLowerCase().includes(keyword))
  );
});

// 过滤后的排除IP列表
const filteredExcludedIPs = computed(() => {
  if (!excludedSearchKeyword.value.trim()) {
    return excludedIPs.value;
  }
  const keyword = excludedSearchKeyword.value.toLowerCase().trim();
  return excludedIPs.value.filter(excluded =>
    excluded.ipOrCidr.toLowerCase().includes(keyword)
  );
});

// 计算已排除的IP集合（用于快速查找）
const excludedSet = computed(() => {
  return new Set(excludedIPs.value.map(e => e.ipOrCidr));
});

// 检查IP是否被排除
function isExcluded(ip: string): boolean {
  // 简单检查精确匹配
  if (excludedSet.value.has(ip)) return true;

  // 检查通配符和CIDR
  for (const excluded of excludedIPs.value) {
    const pattern = excluded.ipOrCidr;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (regex.test(ip)) return true;
    }
    // CIDR检查在服务端完成
  }
  return false;
}

onMounted(async () => {
  await Promise.all([loadStats(), loadChanges(), loadExcludedIPs()]);
});

async function loadStats() {
  try {
    stats.value = await window.electronAPI.anomaly.getStats();
  } catch (error) {
    ElMessage.error(`加载统计失败: ${(error as Error).message}`);
  }
}

async function loadChanges() {
  loading.value = true;
  selectedChanges.value = [];
  try {
    changes.value = await window.electronAPI.anomaly.getChanges(showUnacknowledgedOnly.value);
  } catch (error) {
    ElMessage.error(`加载事件失败: ${(error as Error).message}`);
  } finally {
    loading.value = false;
  }
}

async function loadExcludedIPs() {
  loadingExcluded.value = true;
  try {
    excludedIPs.value = await window.electronAPI.anomaly.getExcludedIPs();
  } catch (error) {
    ElMessage.error(`加载排除规则失败: ${(error as Error).message}`);
  } finally {
    loadingExcluded.value = false;
  }
}

// 表格选择变化
function handleSelectionChange(selection: IPMACChange[]) {
  selectedChanges.value = selection;
}

// 批量确认
async function handleBatchAcknowledge() {
  if (selectedChanges.value.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定要确认选中的 ${selectedChanges.value.length} 个事件吗？`, '批量确认', { type: 'info' });

    // 逐个确认
    for (const change of selectedChanges.value) {
      if (!change.acknowledged) {
        await window.electronAPI.anomaly.acknowledge(change.id);
      }
    }

    ElMessage.success(`已确认 ${selectedChanges.value.length} 个事件`);
    changesTableRef.value?.clearSelection();
    await Promise.all([loadStats(), loadChanges()]);
  } catch {
    // User cancelled
  }
}

// 批量排除
async function handleBatchExclude() {
  if (selectedChanges.value.length === 0) return;

  // 获取唯一的IP列表
  const uniqueIPs = [...new Set(selectedChanges.value.map(c => c.ip))];

  try {
    await ElMessageBox.confirm(
      `确定要将选中的 ${uniqueIPs.length} 个IP加入排除列表吗？\n\nIP列表：${uniqueIPs.join(', ')}`,
      '批量排除',
      { type: 'warning' }
    );

    for (const ip of uniqueIPs) {
      if (!isExcluded(ip)) {
        await window.electronAPI.anomaly.addExcludedIP({ ipOrCidr: ip });
      }
    }

    ElMessage.success(`已添加 ${uniqueIPs.length} 个IP到排除列表`);
    changesTableRef.value?.clearSelection();
    await loadExcludedIPs();
  } catch {
    // User cancelled
  }
}

// 批量删除
async function handleBatchDelete() {
  if (selectedChanges.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedChanges.value.length} 个事件吗？此操作不可恢复。`,
      '批量删除',
      { type: 'error' }
    );

    const ids = selectedChanges.value.map(c => c.id);
    await window.electronAPI.anomaly.deleteChanges(ids);

    ElMessage.success(`已删除 ${ids.length} 个事件`);
    changesTableRef.value?.clearSelection();
    await Promise.all([loadStats(), loadChanges()]);
  } catch {
    // User cancelled
  }
}

function handleAcknowledge(change: IPMACChange) {
  selectedChange.value = change;
  ackNotes.value = change.notes || '';
  ackDialogVisible.value = true;
}

async function confirmAcknowledge() {
  if (!selectedChange.value) return;

  try {
    await window.electronAPI.anomaly.acknowledge(selectedChange.value.id, ackNotes.value);
    ElMessage.success('已确认');
    ackDialogVisible.value = false;
    await Promise.all([loadStats(), loadChanges()]);
  } catch (error) {
    ElMessage.error(`确认失败: ${(error as Error).message}`);
  }
}

async function handleAcknowledgeAll() {
  try {
    await ElMessageBox.confirm('确定要确认所有未处理的事件吗？', '批量确认', { type: 'warning' });
    const count = await window.electronAPI.anomaly.acknowledgeAll();
    ElMessage.success(`已确认 ${count} 个事件`);
    await Promise.all([loadStats(), loadChanges()]);
  } catch {
    // User cancelled
  }
}

async function showBindingHistory(ip: string) {
  historyIp.value = ip;
  historyDialogVisible.value = true;
  loadingHistory.value = true;

  try {
    bindingHistory.value = await window.electronAPI.anomaly.getBindingHistory(ip);
  } catch (error) {
    ElMessage.error(`加载历史失败: ${(error as Error).message}`);
  } finally {
    loadingHistory.value = false;
  }
}

function showAddExcludedDialog() {
  excludedForm.ipOrCidr = '';
  excludedForm.description = '';
  excludedDialogVisible.value = true;
}

async function handleAddExcluded() {
  if (!excludedFormRef.value) return;

  const valid = await excludedFormRef.value.validate().catch(() => false);
  if (!valid) return;

  try {
    await window.electronAPI.anomaly.addExcludedIP({
      ipOrCidr: excludedForm.ipOrCidr,
      description: excludedForm.description || undefined,
    });
    ElMessage.success('添加成功');
    excludedDialogVisible.value = false;
    await loadExcludedIPs();
  } catch (error) {
    ElMessage.error(`添加失败: ${(error as Error).message}`);
  }
}

async function handleDeleteExcluded(excluded: ExcludedIP) {
  try {
    await ElMessageBox.confirm(`确定要删除排除规则 "${excluded.ipOrCidr}" 吗？`, '确认删除', { type: 'warning' });
    await window.electronAPI.anomaly.deleteExcludedIP(excluded.id);
    ElMessage.success('删除成功');
    await loadExcludedIPs();
  } catch {
    // User cancelled
  }
}

// 排除IP表格选择变化
function handleExcludedSelectionChange(selection: ExcludedIP[]) {
  selectedExcludedIPs.value = selection;
}

// 批量删除排除规则
async function handleBatchDeleteExcluded() {
  if (selectedExcludedIPs.value.length === 0) return;

  const ipList = selectedExcludedIPs.value.map(e => e.ipOrCidr).join(', ');

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedExcludedIPs.value.length} 个排除规则吗？\n\n${ipList}`,
      '批量删除',
      { type: 'error' }
    );

    for (const excluded of selectedExcludedIPs.value) {
      await window.electronAPI.anomaly.deleteExcludedIP(excluded.id);
    }

    ElMessage.success(`已删除 ${selectedExcludedIPs.value.length} 个排除规则`);
    excludedTableRef.value?.clearSelection();
    await loadExcludedIPs();
  } catch {
    // User cancelled
  }
}

// 导出变化事件
async function handleExportChanges() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const filePath = await window.electronAPI.export.changes(showUnacknowledgedOnly.value);
    if (filePath) {
      ElMessage.success(`导出成功: ${filePath}`);
    }
  } catch (error) {
    ElMessage.error(`导出失败: ${(error as Error).message}`);
  } finally {
    exporting.value = false;
  }
}

async function quickExclude(ip: string) {
  try {
    await ElMessageBox.confirm(`确定要将 ${ip} 加入排除列表吗？之后将不再检测该IP的变化。`, '排除IP', { type: 'info' });
    await window.electronAPI.anomaly.addExcludedIP({ ipOrCidr: ip });
    ElMessage.success('已添加到排除列表');
    await loadExcludedIPs();
  } catch {
    // User cancelled
  }
}

function getChangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'mac_changed': 'MAC变化',
    'new_ip': '新IP',
    'ip_reused': 'IP重用',
  };
  return labels[type] || type;
}

function getChangeTypeTag(type: string): string {
  const tags: Record<string, string> = {
    'mac_changed': 'danger',
    'new_ip': 'success',
    'ip_reused': 'warning',
  };
  return tags[type] || 'info';
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN');
}
</script>

<style scoped>
.anomaly-management {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.stats-row {
  margin-bottom: 20px;
}

.excluded-ips-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.batch-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.format-tips {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.format-tips p {
  margin: 0 0 8px;
  font-weight: 500;
}

.format-tips ul {
  margin: 0;
  padding-left: 20px;
}

.format-tips li {
  color: #606266;
  font-size: 12px;
  margin-bottom: 4px;
}
</style>
