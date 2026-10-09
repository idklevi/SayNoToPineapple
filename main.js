const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');

// Enforce single instance lock to prevent duplicate HUD windows
const gotTheLock = app.requestSingleInstanceLock();

let hudWindow = null;

function createWindow() {
  if (hudWindow && !hudWindow.isDestroyed()) {
    if (hudWindow.isMinimized()) hudWindow.restore();
    hudWindow.focus();
    return hudWindow;
  }

  hudWindow = new BrowserWindow({
    width: 420,
    height: 640,
    resizable: false,
    frame: false,
    backgroundColor: '#020617',
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Ensure window stays pinned above full-screen Zoom/Teams/Meet windows on macOS
  hudWindow.setAlwaysOnTop(true, 'screen-saver');
  if (hudWindow.setVisibleOnAllWorkspaces) {
    hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Load application with retry in case backend server is initializing
  const loadApp = () => {
    if (!hudWindow || hudWindow.isDestroyed()) return;
    hudWindow.loadURL('http://localhost:8080/index.html').catch(() => {
      setTimeout(loadApp, 250);
    });
  };
  loadApp();

  hudWindow.on('closed', () => {
    hudWindow = null;
    app.quit();
  });

  return hudWindow;
}

if (!gotTheLock) {
  // If another instance is running, exit immediately
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus the existing singleton window
    if (hudWindow && !hudWindow.isDestroyed()) {
      if (hudWindow.isMinimized()) hudWindow.restore();
      hudWindow.focus();
    }
  });

  // IPC listeners for HUD controls
  ipcMain.on('minimize-hud', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.minimize();
    }
  });

  ipcMain.on('close-hud', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.close();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Register Escape key to instantly close active HUD window
    globalShortcut.register('Escape', () => {
      if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.close();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Cleanup shortcuts on quit to prevent memory leaks
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
