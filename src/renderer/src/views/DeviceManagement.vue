<template>
  <div class="device-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备管理</span>
          <el-button type="primary" @click="handleAdd">添加设备</el-button>
        </div>
      </template>

      <DeviceTable
        :devices="deviceStore.devices"
        :loading="deviceStore.loading"
        @edit="handleEdit"
        @delete="handleDelete"
        @test="handleTestConnection"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="500px"
      @closed="handleDialogClosed"
    >
      <DeviceForm ref="formRef" :device="editingDevice" />

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import DeviceTable from '../components/DeviceTable.vue';
import DeviceForm from '../components/DeviceForm.vue';
import { useDeviceStore } from '../stores/devices';
import type { Device, CreateDeviceInput, UpdateDeviceInput } from '../../../shared/types/device';

const deviceStore = useDeviceStore();

const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref<InstanceType<typeof DeviceForm>>();
const editingDevice = ref<Device | undefined>();

onMounted(async () => {
  await deviceStore.fetchAll();
});

function handleAdd() {
  isEdit.value = false;
  editingDevice.value = undefined;
  dialogVisible.value = true;
}

function handleEdit(device: Device) {
  isEdit.value = true;
  editingDevice.value = device;
  dialogVisible.value = true;
}

async function handleDelete(device: Device) {
  try {
    await ElMessageBox.confirm(
      `确定要删除设备 "${device.name}" 吗?`,
      '确认删除',
      { type: 'warning' }
    );

    await deviceStore.remove(device.id);
    ElMessage.success('删除成功');
  } catch {
    // User cancelled or error occurred
  }
}

async function handleTestConnection(id: number) {
  try {
    ElMessage.info('正在测试连接...');
    const result = await deviceStore.testConnection(id);
    if (result.success) {
      ElMessage.success('连接成功');
    } else {
      ElMessage.error(`连接失败: ${result.error}`);
    }
  } catch (error) {
    ElMessage.error(`连接测试异常: ${(error as Error).message}`);
  }
}

async function handleSubmit() {
  if (!formRef.value) return;

  const isValid = await formRef.value.validate();
  if (!isValid) return;

  submitting.value = true;
  try {
    const formData = formRef.value.getFormData();

    if (isEdit.value && editingDevice.value) {
      const input: UpdateDeviceInput = {
        id: editingDevice.value.id,
        ...formData,
      };
      // Don't send empty password on edit
      if (!input.password) {
        delete input.password;
      }
      await deviceStore.update(input);
      ElMessage.success('更新成功');
    } else {
      const input: CreateDeviceInput = formData;
      await deviceStore.create(input);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error(`操作失败: ${(error as Error).message}`);
  } finally {
    submitting.value = false;
  }
}

function handleDialogClosed() {
  formRef.value?.resetForm();
}
</script>

<style scoped>
.device-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
