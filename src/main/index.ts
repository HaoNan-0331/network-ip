import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initDatabase, closeDatabase } from './services/database';
import { registerDeviceHandlers } from './ipc/devices';
import { registerARPHandlers } from './ipc/arp';
import { registerNetworkHandlers } from './ipc/network';
import { registerAnomalyHandlers } from './ipc/anomaly';
import { registerExportHandlers } from './ipc/export';
import { registerOUIHandlers } from './ipc/oui';
import { registerSchedulerHandlers } from './ipc/scheduler';
import { registerSettingsHandlers } from './ipc/settings';
import { SchedulerService } from './services/schedulerService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NetworkIP - 网络IP/MAC监控系统',
    webPreferences: {
      preload: path.join(__dirname, 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  initDatabase();
  registerDeviceHandlers();
  registerARPHandlers();
  registerNetworkHandlers();
  registerAnomalyHandlers();
  registerExportHandlers();
  registerOUIHandlers();
  registerSchedulerHandlers();
  registerSettingsHandlers();
  SchedulerService.start();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Close database on app quit
app.on('will-quit', () => {
  closeDatabase();
});
