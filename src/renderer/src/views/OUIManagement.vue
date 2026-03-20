<template>
  <div class="oui-management">
    <el-row :gutter="20">
      <!-- 统计卡片 -->
      <el-col :span="24">
        <el-row :gutter="16" class="stats-row">
          <el-col :span="8">
            <el-card shadow="hover">
              <el-statistic title="OUI 记录数" :value="stats.total" />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <el-statistic title="自定义记录" :value="stats.custom" />
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover">
              <el-statistic title="厂商数量" :value="stats.vendors" />
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <!-- OUI 列表 -->
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>OUI 厂商数据库</span>
              <div class="header-actions">
                <div v-if="selectedOUIs.length > 0" class="batch-actions">
                  <el-tag type="info">已选 {{ selectedOUIs.length }} 项</el-tag>
                  <el-button size="small" type="danger" @click="handleBatchDelete">
                    批量删除
                  </el-button>
                </div>
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索 OUI/厂商"
                  clearable
                  style="width: 200px"
                  @input="handleSearch"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button size="small" type="primary" @click="showAddDialog">
                  添加 OUI
                </el-button>
                <el-button size="small" @click="showBatchAddDialog">
                  批量添加
                </el-button>
                <el-button size="small" @click="loadData" :loading="loading">
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            ref="tableRef"
            :data="ouiList"
            v-loading="loading"
            size="small"
            max-height="500"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="ouiPrefix" label="OUI 前缀" width="140">
              <template #default="{ row }">
                <el-tag>{{ formatOUI(row.ouiPrefix) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="vendorName" label="厂商名称" min-width="200" />
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isCustom ? 'warning' : 'info'" size="small">
                  {{ row.isCustom ? '自定义' : '系统' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="handleEdit(row)">
                  编辑
                </el-button>
                <el-button
                  v-if="row.isCustom"
                  size="small"
                  type="danger"
                  text
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loading && ouiList.length === 0" description="暂无 OUI 数据" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 OUI' : '添加 OUI'" width="450px">
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="OUI 前缀" prop="ouiPrefix">
          <el-input
            v-model="formData.ouiPrefix"
            placeholder="6位十六进制，如: A0A33B 或 A0:A3:3B"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="厂商名称" prop="vendorName">
          <el-input v-model="formData.vendorName" placeholder="如: Huawei, Cisco" />
        </el-form-item>
      </el-form>
      <div class="format-tips">
        <p>OUI 是 MAC 地址的前6位，用于标识设备厂商</p>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量添加对话框 -->
    <el-dialog v-model="batchDialogVisible" title="批量添加 OUI" width="600px">
      <el-form :model="batchForm" ref="batchFormRef" label-width="100px">
        <el-form-item label="OUI 数据">
          <el-input
            v-model="batchForm.data"
            type="textarea"
            :rows="10"
            placeholder="每行一条，格式: OUI前缀,厂商名称&#10;示例:&#10;A0A33B,Huawei&#10;001E10,Cisco&#10;000C29,VMware"
          />
        </el-form-item>
      </el-form>
      <div class="format-tips">
        <p>每行一条记录，用逗号分隔 OUI 前缀和厂商名称</p>
        <p>OUI 前缀支持格式: A0A33B 或 A0:A3:3B 或 A0-A3-3B</p>
      </div>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAdd" :loading="submitting">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { OUIEntry, CreateOUIInput, UpdateOUIInput, OUIStats } from '../../../shared/types/oui';

const ouiList = ref<OUIEntry[]>([]);
const stats = ref<OUIStats>({ total: 0, custom: 0, vendors: 0 });
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const batchDialogVisible = ref(false);
const isEdit = ref(false);
const searchKeyword = ref('');
const formRef = ref<FormInstance>();
const batchFormRef = ref<FormInstance>();
const tableRef = ref();
const selectedOUIs = ref<OUIEntry[]>([]);

const formData = reactive<CreateOUIInput & { id?: number }>({
  ouiPrefix: '',
  vendorName: '',
});

const batchForm = reactive({
  data: '',
});

const formRules: FormRules = {
  ouiPrefix: [
    { required: true, message: '请输入 OUI 前缀', trigger: 'blur' },
    {
      pattern: /^([0-9A-Fa-f]{2}[:\-]?){2}[0-9A-Fa-f]{2}$/,
      message: 'OUI 格式无效，需要6位十六进制字符',
      trigger: 'blur'
    },
  ],
  vendorName: [
    { required: true, message: '请输入厂商名称', trigger: 'blur' },
  ],
};

onMounted(async () => {
  await Promise.all([loadStats(), loadData()]);
});

async function loadStats() {
  try {
    stats.value = await window.electronAPI.oui.getStats();
  } catch (error) {
    ElMessage.error(`加载统计失败: ${(error as Error).message}`);
  }
}

async function loadData() {
  loading.value = true;
  selectedOUIs.value = [];
  try {
    ouiList.value = await window.electronAPI.oui.getAll();
  } catch (error) {
    ElMessage.error(`加载数据失败: ${(error as Error).message}`);
  } finally {
    loading.value = false;
  }
}

// 搜索防抖
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
async function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    loading.value = true;
    try {
      if (searchKeyword.value.trim()) {
        ouiList.value = await window.electronAPI.oui.search(searchKeyword.value.trim());
      } else {
        ouiList.value = await window.electronAPI.oui.getAll();
      }
    } catch (error) {
      ElMessage.error(`搜索失败: ${(error as Error).message}`);
    } finally {
      loading.value = false;
    }
  }, 300);
}

// 表格选择变化
function handleSelectionChange(selection: OUIEntry[]) {
  selectedOUIs.value = selection;
}

function showAddDialog() {
  isEdit.value = false;
  formData.id = undefined;
  formData.ouiPrefix = '';
  formData.vendorName = '';
  dialogVisible.value = true;
}

function handleEdit(row: OUIEntry) {
  isEdit.value = true;
  formData.id = row.id;
  formData.ouiPrefix = row.ouiPrefix;
  formData.vendorName = row.vendorName;
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (isEdit.value && formData.id) {
      const input: UpdateOUIInput = {
        id: formData.id,
        vendorName: formData.vendorName,
      };
      await window.electronAPI.oui.update(input);
      ElMessage.success('更新成功');
    } else {
      const input: CreateOUIInput = {
        ouiPrefix: formData.ouiPrefix,
        vendorName: formData.vendorName,
      };
      await window.electronAPI.oui.add(input);
      ElMessage.success('添加成功');
    }

    dialogVisible.value = false;
    await Promise.all([loadStats(), loadData()]);
  } catch (error) {
    ElMessage.error(`操作失败: ${(error as Error).message}`);
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: OUIEntry) {
  try {
    await ElMessageBox.confirm(
      `确定要删除 OUI "${row.ouiPrefix}" (${row.vendorName}) 吗？`,
      '确认删除',
      { type: 'warning' }
    );

    await window.electronAPI.oui.delete(row.id);
    ElMessage.success('删除成功');
    await Promise.all([loadStats(), loadData()]);
  } catch {
    // User cancelled
  }
}

async function handleBatchDelete() {
  if (selectedOUIs.value.length === 0) return;

  // 只能删除自定义的记录
  const customOUIs = selectedOUIs.value.filter(o => o.isCustom);
  if (customOUIs.length === 0) {
    ElMessage.warning('无法删除系统预设的 OUI 条目');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${customOUIs.length} 个 OUI 条目吗？`,
      '批量删除',
      { type: 'error' }
    );

    const ids = customOUIs.map(o => o.id);
    const deleted = await window.electronAPI.oui.deleteBatch(ids);

    ElMessage.success(`已删除 ${deleted} 个 OUI 条目`);
    tableRef.value?.clearSelection();
    await Promise.all([loadStats(), loadData()]);
  } catch {
    // User cancelled
  }
}

function showBatchAddDialog() {
  batchForm.data = '';
  batchDialogVisible.value = true;
}

async function handleBatchAdd() {
  if (!batchForm.data.trim()) {
    ElMessage.warning('请输入 OUI 数据');
    return;
  }

  submitting.value = true;
  try {
    const lines = batchForm.data.trim().split('\n');
    const entries: CreateOUIInput[] = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        entries.push({
          ouiPrefix: parts[0],
          vendorName: parts[1],
        });
      }
    }

    if (entries.length === 0) {
      ElMessage.warning('未解析到有效的 OUI 数据');
      return;
    }

    const count = await window.electronAPI.oui.addBatch(entries);
    ElMessage.success(`成功导入 ${count} 条 OUI 记录`);
    batchDialogVisible.value = false;
    await Promise.all([loadStats(), loadData()]);
  } catch (error) {
    ElMessage.error(`导入失败: ${(error as Error).message}`);
  } finally {
    submitting.value = false;
  }
}

function formatOUI(prefix: string): string {
  // 格式化为 XX:XX:XX
  return prefix.replace(/(.{2})/g, '$1:').slice(0, 8);
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN');
}
</script>

<style scoped>
.oui-management {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.stats-row {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.batch-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.format-tips {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
}

.format-tips p {
  margin: 0 0 4px;
  color: #606266;
  font-size: 12px;
}

.format-tips p:last-child {
  margin-bottom: 0;
}
</style>
