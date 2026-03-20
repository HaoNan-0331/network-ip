import { createRouter, createWebHashHistory } from 'vue-router';
import DeviceManagement from '../views/DeviceManagement.vue';
import ARPManagement from '../views/ARPManagement.vue';
import NetworkManagement from '../views/NetworkManagement.vue';
import AnomalyManagement from '../views/AnomalyManagement.vue';
import OUIManagement from '../views/OUIManagement.vue';
import SettingsManagement from '../views/SettingsManagement.vue';

const routes = [
  {
    path: '/',
    name: 'DeviceManagement',
    component: DeviceManagement,
  },
  {
    path: '/arp',
    name: 'ARPManagement',
    component: ARPManagement,
  },
  {
    path: '/network',
    name: 'NetworkManagement',
    component: NetworkManagement,
  },
  {
    path: '/anomaly',
    name: 'AnomalyManagement',
    component: AnomalyManagement,
  },
  {
    path: '/oui',
    name: 'OUIManagement',
    component: OUIManagement,
  },
  {
    path: '/settings',
    name: 'SettingsManagement',
    component: SettingsManagement,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
