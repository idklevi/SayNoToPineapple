import { app, BrowserWindow, ipcMain, globalShortcut, session } from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_URL = 'http://127.0.0.1:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let hudWindow = null;
let serverProcess = null;
let serverStartupFailure = null;
let serverOutput = [];
let startupLogPath = path.join(process.cwd(), 'ghost-startup.log');

function logStartup(message, error) {
  const detail = error ? ` ${error.stack || error.message || String(error)}` : '';
  const line = `[${new Date().toISOString()}] ${message}${detail}\n`;
  console.error(line.trim());
  try { fs.appendFileSync(startupLogPath, line); } catch { /* Console is the fallback. */ }
}

function runtimePaths() {
  const appPath = app.getAppPath();
  return {
    appPath,
    serverPath: app.isPackaged ? path.join(appPath, 'server.cjs') : path.join(__dirname, 'server.cjs'),
    staticDir: app.isPackaged ? path.join(appPath, 'dist') : path.join(__dirname, 'dist'),
    preloadPath: path.join(appPath, 'preload.cjs'),
    envPath: app.isPackaged ? path.join(process.resourcesPath, '.env') : path.join(process.cwd(), '.env'),
  };
}

function requestServerStatus() {
  return new Promise((resolve, reject) => {
    const request = http.get(`${SERVER_URL}/api/status`, { timeout: 1200 }, (response) => {
      response.resume();
      response.statusCode && response.statusCode < 500 ? resolve() : reject(new Error(`Health check returned ${response.statusCode}`));
    });
    request.on('timeout', () => request.destroy(new Error('Health check timed out')));
    request.on('error', reject);
  });
}

async function waitForServer(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (serverStartupFailure) throw serverStartupFailure;
    try { await requestServerStatus(); return; }
    catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 300)); }
  }
  throw new Error(`Ghost local server did not respond within ${Math.round(timeoutMs / 1000)} seconds. ${lastError?.message || ''}`);
}

async function startPackagedServer() {
  if (!app.isPackaged || serverProcess) return;
  const paths = runtimePaths();
  if (!fs.existsSync(paths.serverPath)) throw new Error(`Bundled server was not found at ${paths.serverPath}`);
  if (!fs.existsSync(paths.staticDir)) throw new Error(`Bundled static assets were not found at ${paths.staticDir}`);
  if (!fs.existsSync(paths.preloadPath)) throw new Error(`Bundled preload bridge was not found at ${paths.preloadPath}`);
  serverStartupFailure = null;
  serverOutput = [];
  logStartup(`Starting bundled server from ${paths.serverPath}`);
  serverProcess = spawn(process.execPath, [paths.serverPath], {
    env: {
      ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production',
      GHOST_APP_DIR: paths.appPath,
      GHOST_ENV_PATH: paths.envPath,
      GHOST_STATIC_DIR: paths.staticDir,
      GHOST_SETTINGS_PATH: path.join(app.getPath('userData'), 'ghost-settings.json'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const captureServerOutput = (prefix, chunk) => {
    const text = String(chunk).trim();
    if (!text) return;
    serverOutput = [...serverOutput, text].slice(-12);
    logStartup(`[${prefix}] ${text}`);
  };
  serverProcess.stdout.on('data', (chunk) => captureServerOutput('server', chunk));
  serverProcess.stderr.on('data', (chunk) => captureServerOutput('server:error', chunk));
  serverProcess.on('error', (error) => {
    serverStartupFailure = new Error(`Unable to spawn bundled server: ${error.message}`);
    logStartup('Unable to spawn bundled server.', error);
  });
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0) serverStartupFailure = new Error(`Bundled server exited before becoming ready (code=${code}, signal=${signal}). ${serverOutput.join(' ')}`);
    logStartup(`Bundled server exited (code=${code}, signal=${signal}).`);
    serverProcess = null;
  });
}

function createWindow() {
  if (hudWindow && !hudWindow.isDestroyed()) {
    if (hudWindow.isMinimized()) hudWindow.restore();
    hudWindow.focus();
    return hudWindow;
  }
  const paths = runtimePaths();
  hudWindow = new BrowserWindow({
    width: 420, height: 640, resizable: false, frame: false, transparent: true,
    backgroundColor: '#00000000', alwaysOnTop: true, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: paths.preloadPath },
  });
  hudWindow.setAlwaysOnTop(true, 'screen-saver');
  hudWindow.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true });
  hudWindow.once('ready-to-show', () => hudWindow?.show());
  hudWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) logStartup(`Renderer load failed (${code}): ${description} (${url})`);
  });
  hudWindow.on('closed', () => { hudWindow = null; if (process.platform !== 'darwin') app.quit(); });
  return hudWindow;
}

function showStartupFailure(error) {
  logStartup('Ghost startup failed.', error);
  const window = createWindow();
  const message = String(error?.message || error).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<body style="margin:0;background:#080b12;color:#f4f7ff;font:14px -apple-system,BlinkMacSystemFont,sans-serif;padding:28px"><div style="border:1px solid #ff3dce;border-radius:16px;padding:20px;background:#121826"><div style="font:11px monospace;color:#38ddf8">GHOST / STARTUP DIAGNOSTIC</div><h1 style="font-size:22px">The HUD server did not start</h1><p style="line-height:1.5;color:#99a6c2">${message}</p><p style="line-height:1.5;color:#99a6c2">Diagnostic log: <code>${startupLogPath}</code></p></div></body>`)}`);
  window.show();
  window.webContents.openDevTools({ mode: 'detach' });
}

async function showStartupLoading(window) {
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<body style="margin:0;background:#080b12;color:#f4f7ff;font:14px -apple-system,BlinkMacSystemFont,sans-serif;padding:28px"><div style="border:1px solid #38ddf8;border-radius:16px;padding:20px;background:#121826"><div style="font:11px monospace;color:#38ddf8">GHOST / INITIALIZING</div><h1 style="font-size:22px">Starting your copilot…</h1><p style="line-height:1.5;color:#99a6c2">Connecting the local HUD service.</p></div></body>')}`);
  window.show();
}

async function launchHud() {
  try {
    const window = createWindow();
    await showStartupLoading(window);
    if (app.isPackaged) await startPackagedServer();
    await waitForServer(app.isPackaged ? 45000 : 30000);
    await window.loadURL(SERVER_URL);
  } catch (error) { showStartupFailure(error); }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
else {
  process.on('uncaughtException', (error) => logStartup('Uncaught main-process exception.', error));
  process.on('unhandledRejection', (reason) => logStartup('Unhandled main-process rejection.', reason));
  app.on('second-instance', () => { if (hudWindow && !hudWindow.isDestroyed()) { if (hudWindow.isMinimized()) hudWindow.restore(); hudWindow.focus(); } else { void launchHud(); } });
  ipcMain.on('minimize-hud', () => hudWindow?.minimize());
  ipcMain.on('close-hud', () => hudWindow?.close());
  app.whenReady().then(() => {
    startupLogPath = path.join(app.getPath('userData'), 'ghost-startup.log');
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const origin = webContents.getURL();
      callback(permission === 'media' && (origin.startsWith(SERVER_URL) || origin.startsWith('file:')));
    });
    void launchHud();
    globalShortcut.register('Escape', () => hudWindow?.close());
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void launchHud(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); if (serverProcess) serverProcess.kill(); });
}
