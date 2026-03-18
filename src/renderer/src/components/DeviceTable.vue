<template>
  <el-table :data="devices" v-loading="loading" stripe>
    <el-table-column prop="name" label="设备名称" min-width="120" />

    <el-table-column prop="ip" label="IP地址" min-width="130" />

    <el-table-column prop="vendor" label="厂商" min-width="80">
      <template #default="{ row }">
        <el-tag>{{ vendorLabels[row.vendor] }}</el-tag>
      </template>
    </el-table-column>

    <el-table-column prop="protocol" label="协议" min-width="80">
      <template #default="{ row }">
        <el-tag :type="row.protocol === 'ssh' ? 'success' : 'warning'">
          {{ row.protocol.toUpperCase() }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column prop="port" label="端口" width="80" />

    <el-table-column prop="username" label="用户名" min-width="100" />

    <el-table-column prop="status" label="状态" min-width="80">
      <template #default="{ row }">
        <el-tag :type="statusTypes[row.status]">
          {{ statusLabels[row.status] }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="220" fixed="right">
      <template #default="{ row }">
        <el-button size="small" @click="handleTestConnection(row)">
          测试连接
        </el-button>
        <el-button size="small" @click="handleEdit(row)">
          编辑
        </el-button>
        <el-button size="small" type="danger" @click="handleDelete(row)">
          删除
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import type { Device } from '../../../shared/types/device';

defineProps<{
  devices: Device[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  edit: [device: Device];
  delete: [device: Device];
  test: [id: number];
}>();

const vendorLabels: Record<string, string> = {
  huawei: '华为',
  h3c: '华三',
  ruijie: '锐捷',
  cisco: '思科',
};

const statusLabels: Record<string, string> = {
  online: '在线',
  offline: '离线',
  unknown: '未知',
};

const statusTypes: Record<string, string> = {
  online: 'success',
  offline: 'danger',
  unknown: 'info',
};

function handleEdit(device: Device) {
  emit('edit', device);
}

function handleDelete(device: Device) {
  emit('delete', device);
}

function handleTestConnection(device: Device) {
  emit('test', device.id);
}
</script>
