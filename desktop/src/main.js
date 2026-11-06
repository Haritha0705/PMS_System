// Starts the PMS server privately on this PC and shows the app in its own window.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const { fork } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const settings = require('./settings');

const HOST = '127.0.0.1';
// A fixed port keeps the saved login between launches (the browser ties it to the address)
const PREFERRED_PORT = 45450;
const STARTUP_TIMEOUT_MS = 90_000;

const paths = {
  server: app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, '..', '..', 'server'),
  client: app.isPackaged
    ? path.join(process.resourcesPath, 'client')
    : path.join(__dirname, '..', '.stage', 'client'),
};
const logDir = () => path.join(app.getPath('userData'), 'logs');

let mainWindow = null;
let serverProcess = null;
let quitting = false;

// ── Screens ──────────────────────────────────────────────────

function createWindow() {
  return new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'PMS Application',
    icon: path.join(paths.client, 'icon.png'),
    backgroundColor: '#0a0a3c',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
}

/** The setup and starting screens use the app's own stylesheet, so they look the same. */
function showScreen(view) {
  const css = fs.readdirSync(path.join(paths.client, 'assets')).find((f) => f.endsWith('.css'));
  mainWindow.webContents.once('did-finish-load', () => {
    if (css) mainWindow.webContents.insertCSS(fs.readFileSync(path.join(paths.client, 'assets', css), 'utf8'));
  });
  return mainWindow.loadFile(path.join(__dirname, 'screen.html'), {
    query: { view, icon: new URL(`file://${path.join(paths.client, 'icon.png').replace(/\\/g, '/')}`).href },
  });
}

function keepAppInsideWindow(baseUrl) {
  const { webContents } = mainWindow;
  webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(baseUrl)) event.preventDefault();
  });
}

// ── Server ───────────────────────────────────────────────────

function findPort() {
  const tryListen = (port) =>
    new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(port, HOST, () => {
        const { port: chosen } = probe.address();
        probe.close(() => resolve(chosen));
      });
    });
  return tryListen(PREFERRED_PORT).catch(() => tryListen(0));
}

function startServer(port, databaseUrl) {
  fs.mkdirSync(logDir(), { recursive: true });
  const output = fs.openSync(path.join(logDir(), 'server-output.log'), 'w');
  const { jwtSecret, refreshSecret } = settings.getTokenSecrets();

  serverProcess = fork(path.join(paths.server, 'dist', 'app.js'), [], {
    cwd: app.getPath('userData'),
    stdio: ['ignore', output, output, 'ipc'],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      JWT_SECRET: jwtSecret,
      REFRESH_SECRET: refreshSecret,
      TRUST_PROXY_HOPS: '0',
      SERVER_PRINT_ENABLED: 'true', // This PC's own printers
      CLIENT_PATH: paths.client,
      LOG_DIR: logDir(),
      OUTPUT_DIR: path.join(app.getPath('userData'), 'exports'),
      TEMP_DIR: path.join(app.getPath('temp'), 'pms-application'),
    },
  });
  return serverProcess;
}

/** Resolves once the server answers; rejects if it stops or takes too long. */
function waitForServer(child, port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    let finished = false;
    const finish = (fn, value) => {
      if (finished) return;
      finished = true;
      child.off('exit', onExit);
      fn(value);
    };
    const onExit = () => finish(reject, new Error('The server stopped while starting.'));
    child.once('exit', onExit);

    const check = () => {
      if (finished) return;
      const request = http.get({ host: HOST, port, path: '/api/health', timeout: 2000 }, (response) => {
        response.resume();
        if (response.statusCode === 200) finish(resolve);
        else retry();
      });
      request.on('timeout', () => request.destroy());
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) finish(reject, new Error('The server took too long to start.'));
      else setTimeout(check, 500);
    };
    check();
  });
}

async function launch() {
  const databaseUrl = settings.getDatabaseUrl();
  if (!databaseUrl) return showScreen('setup');

  await showScreen('starting');
  try {
    const port = await findPort();
    const child = startServer(port, databaseUrl);
    await waitForServer(child, port);

    child.once('exit', () => {
      if (quitting) return;
      dialog.showErrorBox('PMS Application', 'The application stopped unexpectedly. Please open it again.');
      app.quit();
    });

    const baseUrl = `http://${HOST}:${port}`;
    keepAppInsideWindow(baseUrl);
    return mainWindow.loadURL(baseUrl);
  } catch (err) {
    stopServer();
    return offerRecovery(err);
  }
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  serverProcess = null;
}

async function offerRecovery(err) {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'PMS Application',
    message: 'Could not connect to the database',
    detail: `${err.message}\n\nPlease check the internet connection and the database connection.`,
    buttons: ['Try Again', 'Change Connection', 'Quit'],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 0) return launch();
  if (response === 1) return showScreen('setup');
  return app.quit();
}

// ── Menu and setup messages ──────────────────────────────────

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Change Database Connection...', click: () => { stopServer(); showScreen('setup'); } },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' }],
    },
    {
      label: 'Help',
      submenu: [{ label: 'Open Log Folder', click: () => shell.openPath(logDir()) }],
    },
  ]);
}

ipcMain.handle('save-connection', async (_event, url) => {
  const value = String(url ?? '').trim();
  const error = settings.validateDatabaseUrl(value);
  if (error) return { error };
  try {
    settings.saveDatabaseUrl(value);
  } catch (err) {
    return { error: err.message };
  }
  launch();
  return {};
});

// ── App lifecycle ────────────────────────────────────────────

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(buildMenu());
    mainWindow = createWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
    return launch();
  }).catch((err) => {
    dialog.showErrorBox('PMS Application', err.message);
    app.quit();
  });

  app.on('before-quit', () => {
    quitting = true;
    stopServer();
  });
  app.on('window-all-closed', () => app.quit());
}
