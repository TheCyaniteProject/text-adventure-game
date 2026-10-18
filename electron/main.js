import { app, BrowserWindow, session, ipcMain } from 'electron';

import { fileURLToPath } from 'node:url';
import { watchUI } from './dev-reload.js';

const entry = new URL('../src/index.html', import.meta.url);
function createWindow() {
  const window = new BrowserWindow({
    width: 1380, height: 920, minWidth: 850, minHeight: 650,
    backgroundColor: '#101216', title: 'Solo Adventure',
    webPreferences: { preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(fileURLToPath(entry));
}
app.whenReady().then(() => {
  ipcMain.on('app:quit', event => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (owner && event.senderFrame === owner.webContents.mainFrame && event.senderFrame.url === entry.href) app.quit();
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  createWindow();
  if (!app.isPackaged && process.argv.includes('--dev')) {
    const stopWatching = watchUI(new URL('../src/', import.meta.url), () => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.webContents.isDestroyed()) window.webContents.reloadIgnoringCache();
      }
    });
    app.once('will-quit', stopWatching);
  }
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
