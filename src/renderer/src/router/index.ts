import { createRouter, createWebHashHistory } from 'vue-router';
import DeviceManagement from '../views/DeviceManagement.vue';

const routes = [
  {
    path: '/',
    name: 'DeviceManagement',
    component: DeviceManagement,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
