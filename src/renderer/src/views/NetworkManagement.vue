<template>
  <div class="network-management">
    <el-row :gutter="20">
      <!-- 左侧：网段列表 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>网段管理</span>
              <div class="header-actions">
                <el-button size="small" @click="handleAutoDiscover" :loading="discovering">
                  自动发现
                </el-button>
                <el-button size="small" type="primary" @click="handleAdd">
                  添加
                </el-button>
              </div>
            </div>
          </template>

          <div class="network-list" v-loading="loading">
            <div
              v-for="segment in segments"
              :key="segment.id"
              :class="['network-item', { active: selectedSegment?.id === segment.id }]"
              @click="handleSelectSegment(segment)"
            >
              <div class="network-info">
                <div class="network-name">{{ segment.name }}</div>
                <div class="network-address">{{ segment.network }}/{{ segment.cidr }}</div>
              </div>
              <div class="network-actions">
                <el-tag v-if="segment.isAutoDiscovered" size="small" type="info">自动</el-tag>
                <el-button
                  size="small"
                  text
                  @click.stop="handleEdit(segment)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  text
                  type="danger"
                  @click.stop="handleDelete(segment)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <el-empty v-if="!loading && segments.length === 0" description="暂无网段数据" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：网段详情 -->
      <el-col :span="16">
        <el-card v-if="selectedSegment">
          <template #header>
            <div class="card-header">
              <span>{{ selectedSegment.name }} - IP使用统计</span>
              <div class="header-actions">
                <el-button size="small" @click="handleExport" :loading="exporting">导出CSV</el-button>
                <el-button size="small" @click="refreshIPDetails">刷新</el-button>
              </div>
            </div>
          </template>

          <!-- 使用统计卡片 -->
          <el-row :gutter="16" class="stats-row">
            <el-col :span="6">
              <el-statistic title="总IP数" :value="ipUsage.total" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="已使用" :value="ipUsage.used">
                <template #suffix>
                  <span class="text-success">({{ ipUsage.usagePercent }}%)</span>
                </template>
              </el-statistic>
            </el-col>
            <el-col :span="6">
              <el-statistic title="可用" :value="ipUsage.available" />
            </el-col>
            <el-col :span="6">
              <el-progress
                type="circle"
                :percentage="ipUsage.usagePercent"
                :color="getProgressColor(ipUsage.usagePercent)"
              />
            </el-col>
          </el-row>

          <!-- 使用率进度条 -->
          <div class="usage-bar">
            <el-progress
              :percentage="ipUsage.usagePercent"
              :color="getProgressColor(ipUsage.usagePercent)"
              :stroke-width="20"
              :text-inside="true"
            />
          </div>

          <!-- IP详情表格 -->
          <el-divider content-position="left">IP详情</el-divider>

          <!-- 搜索 -->
          <div class="search-bar">
            <el-input
              v-model="searchIp"
              placeholder="搜索IP地址"
              clearable
              style="width: 180px"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-input
              v-model="searchMac"
              placeholder="搜索MAC地址"
              clearable
              style="width: 180px"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <el-table
            :data="ipDetails"
            v-loading="loadingDetails"
            size="small"
            max-height="400"
          >
            <el-table-column prop="ip" label="IP地址" width="140" sortable :sort-method="sortByIP" />
            <el-table-column prop="mac" label="MAC地址" width="150">
              <template #default="{ row }">
                {{ row.mac || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="macVendor" label="厂商" width="100">
              <template #default="{ row }">
                {{ row.macVendor || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'used' ? 'success' : 'info'" size="small">
                  {{ row.status === 'used' ? '已用' : '弃用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="interface" label="接口" min-width="100">
              <template #default="{ row }">
                {{ row.interface || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="deviceName" label="来源设备" min-width="120">
              <template #default="{ row }">
                {{ row.deviceName || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="lastSeen" label="最后发现" width="160" sortable>
              <template #default="{ row }">
                {{ row.lastSeen ? formatTime(row.lastSeen) : '-' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-empty v-else description="请选择一个网段查看详情" />
      </el-col>
    </el-row>

    <!-- 添加/编辑网段对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑网段' : '添加网段'"
      width="500px"
    >
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" placeholder="如：办公网、服务器网段" />
        </el-form-item>
        <el-form-item label="网段地址" prop="network">
          <el-input v-model="formData.network" placeholder="如：192.168.1.0" />
        </el-form-item>
        <el-form-item label="子网掩码" prop="mask">
          <el-input v-model="formData.mask" placeholder="如：255.255.255.0" />
        </el-form-item>
        <el-form-item label="网关" prop="gateway">
          <el-input v-model="formData.gateway" placeholder="可选" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { NetworkSegment, IPUsage, IPDetail, CreateNetworkInput, UpdateNetworkInput } from '../../../shared/types/network';

const segments = ref<NetworkSegment[]>([]);
const selectedSegment = ref<NetworkSegment | null>(null);
const ipUsage = ref<IPUsage>({ networkId: 0, total: 0, used: 0, available: 0, usagePercent: 0 });
const ipDetails = ref<IPDetail[]>([]);
const loading = ref(false);
const loadingDetails = ref(false);
const discovering = ref(false);
const exporting = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

// 搜索状态
const searchIp = ref('');
const searchMac = ref('');

const formData = reactive<CreateNetworkInput & { id?: number }>({
  name: '',
  network: '',
  mask: '255.255.255.0',
  gateway: '',
  description: '',
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入网段名称', trigger: 'blur' }],
  network: [
    { required: true, message: '请输入网段地址', trigger: 'blur' },
    { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, message: '请输入有效的IP地址', trigger: 'blur' },
  ],
  mask: [
    { required: true, message: '请输入子网掩码', trigger: 'blur' },
    { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, message: '请输入有效的子网掩码', trigger: 'blur' },
  ],
};

onMounted(async () => {
  await loadSegments();
});

async function loadSegments() {
  loading.value = true;
  try {
    segments.value = await window.electronAPI.network.getAll();
  } catch (error) {
    ElMessage.error(`加载网段失败: ${(error as Error).message}`);
  } finally {
    loading.value = false;
  }
}

async function handleSelectSegment(segment: NetworkSegment) {
  selectedSegment.value = segment;
  // 重置搜索条件
  searchIp.value = '';
  searchMac.value = '';
  await refreshIPDetails();
}

// 防止重复请求
let refreshPromise: Promise<void> | null = null;

async function refreshIPDetails() {
  if (!selectedSegment.value) return;

  // 如果正在请求中，直接返回现有的 Promise
  if (refreshPromise) return refreshPromise;

  loadingDetails.value = true;
  refreshPromise = (async () => {
    try {
      const [usage, details] = await Promise.all([
        window.electronAPI.network.getIPUsage(selectedSegment.value!.id),
        window.electronAPI.network.getIPDetails(
          selectedSegment.value!.id,
          searchIp.value || undefined,
          searchMac.value || undefined
        ),
      ]);
      ipUsage.value = usage;
      ipDetails.value = details;
    } catch (error) {
      ElMessage.error(`加载IP详情失败: ${(error as Error).message}`);
    } finally {
      loadingDetails.value = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// 防抖搜索
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    refreshIPDetails();
  }, 300);
}

async function handleAutoDiscover() {
  discovering.value = true;
  try {
    const discovered = await window.electronAPI.network.autoDiscover();
    if (discovered.length > 0) {
      ElMessage.success(`自动发现 ${discovered.length} 个新网段`);
      await loadSegments();
    } else {
      ElMessage.info('未发现新网段');
    }
  } catch (error) {
    ElMessage.error(`自动发现失败: ${(error as Error).message}`);
  } finally {
    discovering.value = false;
  }
}

function handleAdd() {
  isEdit.value = false;
  Object.assign(formData, {
    name: '',
    network: '',
    mask: '255.255.255.0',
    gateway: '',
    description: '',
  });
  dialogVisible.value = true;
}

function handleEdit(segment: NetworkSegment) {
  isEdit.value = true;
  Object.assign(formData, {
    id: segment.id,
    name: segment.name,
    network: segment.network,
    mask: segment.mask,
    gateway: segment.gateway || '',
    description: segment.description || '',
  });
  dialogVisible.value = true;
}

async function handleDelete(segment: NetworkSegment) {
  try {
    await ElMessageBox.confirm(
      `确定要删除网段 "${segment.name}" 吗?`,
      '确认删除',
      { type: 'warning' }
    );

    await window.electronAPI.network.delete(segment.id);
    ElMessage.success('删除成功');
    await loadSegments();

    if (selectedSegment.value?.id === segment.id) {
      selectedSegment.value = null;
    }
  } catch {
    // User cancelled
  }
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value && formData.id) {
      const input: UpdateNetworkInput = {
        id: formData.id,
        name: formData.name,
        network: formData.network,
        mask: formData.mask,
        gateway: formData.gateway || undefined,
        description: formData.description || undefined,
      };
      await window.electronAPI.network.update(input);
      ElMessage.success('更新成功');
    } else {
      const input: CreateNetworkInput = {
        name: formData.name,
        network: formData.network,
        mask: formData.mask,
        gateway: formData.gateway || undefined,
        description: formData.description || undefined,
      };
      await window.electronAPI.network.create(input);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    await loadSegments();
  } catch (error) {
    ElMessage.error(`操作失败: ${(error as Error).message}`);
  } finally {
    submitting.value = false;
  }
}

function getProgressColor(percent: number): string {
  if (percent < 50) return '#67c23a';
  if (percent < 80) return '#e6a23c';
  return '#f56c6c';
}

// 导出网络使用情况
async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const networkId = selectedSegment.value?.id;
    const filePath = await window.electronAPI.export.networkUsage(networkId);
    if (filePath) {
      ElMessage.success(`导出成功: ${filePath}`);
    }
  } catch (error) {
    ElMessage.error(`导出失败: ${(error as Error).message}`);
  } finally {
    exporting.value = false;
  }
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN');
}

// IP 地址数值排序
function sortByIP(a: IPDetail, b: IPDetail): number {
  const ipToNum = (ip: string): number => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  };
  return ipToNum(a.ip) - ipToNum(b.ip);
}
</script>

<style scoped>
.network-management {
  padding: 20px;
  height: 100%;
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

.network-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.network-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.network-item:hover {
  background-color: #f5f7fa;
}

.network-item.active {
  background-color: #ecf5ff;
  border: 1px solid #409eff;
}

.network-info {
  flex: 1;
}

.network-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.network-address {
  font-size: 12px;
  color: #909399;
}

.network-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.stats-row {
  margin-bottom: 20px;
}

.usage-bar {
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.text-success {
  color: #67c23a;
  font-size: 14px;
}
</style>
