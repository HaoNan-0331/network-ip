<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    label-width="100px"
    @submit.prevent
  >
    <el-form-item label="设备名称" prop="name">
      <el-input v-model="formData.name" placeholder="请输入设备名称" />
    </el-form-item>

    <el-form-item label="IP地址" prop="ip">
      <el-input v-model="formData.ip" placeholder="例如: 192.168.1.1" />
    </el-form-item>

    <el-form-item label="厂商" prop="vendor">
      <el-select v-model="formData.vendor" placeholder="请选择厂商">
        <el-option label="华为" value="huawei" />
        <el-option label="华三" value="h3c" />
        <el-option label="锐捷" value="ruijie" />
        <el-option label="思科" value="cisco" />
      </el-select>
    </el-form-item>

    <el-form-item label="协议" prop="protocol">
      <el-radio-group v-model="formData.protocol" @change="handleProtocolChange">
        <el-radio value="ssh">SSH</el-radio>
        <el-radio value="telnet">Telnet</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="端口" prop="port">
      <el-input-number v-model="formData.port" :min="1" :max="65535" />
    </el-form-item>

    <el-form-item label="用户名" prop="username">
      <el-input v-model="formData.username" placeholder="请输入用户名" />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="formData.password"
        type="password"
        placeholder="请输入密码"
        show-password
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { Device, DeviceVendor, DeviceProtocol } from '../../../shared/types/device';

interface FormData {
  name: string;
  ip: string;
  vendor: DeviceVendor;
  protocol: DeviceProtocol;
  port: number;
  username: string;
  password: string;
}

const props = defineProps<{
  device?: Device;
}>();

const emit = defineEmits<{
  submit: [data: FormData];
}>();

const formRef = ref<FormInstance>();

const defaultFormData: FormData = {
  name: '',
  ip: '',
  vendor: 'huawei',
  protocol: 'ssh',
  port: 22,
  username: '',
  password: '',
};

const formData = ref<FormData>({ ...defaultFormData });

const isEdit = computed(() => !!props.device);

const formRules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  ip: [
    { required: true, message: '请输入IP地址', trigger: 'blur' },
    {
      pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
      message: 'IP地址格式不正确',
      trigger: 'blur',
    },
  ],
  vendor: [{ required: true, message: '请选择厂商', trigger: 'change' }],
  protocol: [{ required: true, message: '请选择协议', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      required: !isEdit.value,
      message: '请输入密码',
      trigger: 'blur',
    },
  ],
};

function handleProtocolChange(protocol: DeviceProtocol) {
  formData.value.port = protocol === 'ssh' ? 22 : 23;
}

watch(
  () => props.device,
  (device) => {
    if (device) {
      formData.value = {
        name: device.name,
        ip: device.ip,
        vendor: device.vendor,
        protocol: device.protocol,
        port: device.port,
        username: device.username,
        password: '',
      };
    } else {
      formData.value = { ...defaultFormData };
    }
  },
  { immediate: true }
);

async function validate(): Promise<boolean> {
  if (!formRef.value) return false;
  try {
    await formRef.value.validate();
    return true;
  } catch {
    return false;
  }
}

function getFormData(): FormData {
  return { ...formData.value };
}

function resetForm(): void {
  formRef.value?.resetFields();
}

defineExpose({
  validate,
  getFormData,
  resetForm,
});
</script>
