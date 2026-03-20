<template>
  <el-config-provider :locale="zhCn">
    <el-container class="app-container">
      <el-aside width="200px" class="app-aside">
        <div class="logo">
          <h2>NetworkIP</h2>
          <p>IP/MAC 监控</p>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          class="app-menu"
        >
          <el-menu-item index="/">
            <el-icon><Monitor /></el-icon>
            <span>设备管理</span>
          </el-menu-item>
          <el-menu-item index="/arp">
            <el-icon><Connection /></el-icon>
            <span>ARP 采集</span>
          </el-menu-item>
          <el-menu-item index="/network">
            <el-icon><Grid /></el-icon>
            <span>网段管理</span>
          </el-menu-item>
          <el-menu-item index="/anomaly">
            <el-icon><Warning /></el-icon>
            <span>异常检测</span>
          </el-menu-item>
          <el-menu-item index="/oui">
            <el-icon><Collection /></el-icon>
            <span>OUI 管理</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Monitor, Connection, Grid, Warning, Collection, Setting } from '@element-plus/icons-vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

const route = useRoute();
const activeMenu = computed(() => route.path);
</script>

<style>
.app-container {
  height: 100vh;
}

.app-aside {
  background: #304156;
  color: #fff;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #3a4a5d;
}

.logo h2 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.logo p {
  margin: 4px 0 0;
  color: #8a9aaa;
  font-size: 12px;
}

.app-menu {
  border-right: none;
  background: transparent;
}

.app-menu .el-menu-item {
  color: #bfcbd9;
}

.app-menu .el-menu-item:hover,
.app-menu .el-menu-item.is-active {
  background: #263445;
  color: #409eff;
}

.app-main {
  background: #f5f7fa;
  padding: 0;
  overflow: auto;
}
</style>
