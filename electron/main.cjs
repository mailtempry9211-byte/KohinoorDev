const { app, BrowserWindow, ipcMain, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { fork } = require('child_process');
const http = require('http');

let mainWindow = null;
let setupWindow = null;
let tray = null;
let serverProcess = null;
let currentPort = 5000;

const configPath = path.join(app.getPath('userData'), 'phonelink-settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { port: 5000, remember: false };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function createSetupWindow() {
  if (setupWindow) {
    setupWindow.focus();
    return;
  }

  setupWindow = new BrowserWindow({
    width: 500,
    height: 560,
    resizable: false,
    frame: true,
    title: 'PhoneLink Hub - Server Setup',
    backgroundColor: '#0B0F19',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  setupWindow.loadFile(path.join(__dirname, 'port-selector.html'));

  setupWindow.on('closed', () => {
    setupWindow = null;
    if (!mainWindow && !serverProcess) {
      app.quit();
    }
  });
}

function createMainWindow(port) {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: `PhoneLink Hub - Parental Control & Telemetry (Port ${port})`,
    backgroundColor: '#0B0F19',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const menuTemplate = [
    {
      label: 'PhoneLink Hub',
      submenu: [
        {
          label: 'Change Server Port…',
          click: () => {
            const settings = loadSettings();
            settings.remember = false;
            saveSettings(settings);
            if (serverProcess) {
              serverProcess.kill('SIGTERM');
              serverProcess = null;
            }
            if (mainWindow) {
              mainWindow.close();
              mainWindow = null;
            }
            createSetupWindow();
          }
        },
        { type: 'separator' },
        { label: 'Reload Dashboard', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Minimize to Tray', click: () => mainWindow?.hide() },
        { label: 'Quit Hub', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open ngrok Dashboard (Cloud Tokens)',
          click: () => shell.openExternal('https://dashboard.ngrok.com/get-started/your-authtoken')
        },
        {
          label: 'About PhoneLink Hub',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PhoneLink Hub',
              message: 'PhoneLink Hub v1.0',
              detail: `Standalone Parental Control & Monitoring Desktop Suite.\nRunning locally on http://${getLocalIP()}:${port}\nEmbedded Node.js + LowDB + WebSockets + ngrok Cloud Tunnel.`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (setupWindow) {
      setupWindow.close();
      setupWindow = null;
    }
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function waitForServer(port, callback, attempts = 0) {
  if (attempts > 30) {
    console.error('Server startup timed out');
    return;
  }
  const req = http.get(`http://localhost:${port}/api/tunnel`, (res) => {
    callback();
  });
  req.on('error', () => {
    setTimeout(() => waitForServer(port, callback, attempts + 1), 250);
  });
}

function startBackendServer(port, callback) {
  currentPort = port;

  let serverScript = path.join(__dirname, '../server/src/index.js');
  if (!fs.existsSync(serverScript)) {
    serverScript = path.join(process.resourcesPath, 'server/src/index.js');
  }

  const serverDir = path.dirname(path.dirname(serverScript));
  const userDataDir = path.join(app.getPath('userData'), 'server-data');
  try { fs.mkdirSync(userDataDir, { recursive: true }); } catch (e) {}

  serverProcess = fork(serverScript, [port.toString()], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: port.toString(),
      DATA_DIR: userDataDir
    },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to spawn server process:', err);
  });

  serverProcess.on('exit', (code, sig) => {
    console.log(`Server process exited with code ${code}, signal ${sig}`);
  });

  waitForServer(port, callback);
}

function setupTray() {
  if (tray) return;

  try {
    const icon = path.join(__dirname, 'icon.png');
    if (!fs.existsSync(icon)) return;
    tray = new Tray(icon);
    tray.setToolTip('PhoneLink Hub - Server Active');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show PhoneLink Dashboard',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Change Server Port…',
        click: () => {
          const settings = loadSettings();
          settings.remember = false;
          saveSettings(settings);
          if (serverProcess) {
            serverProcess.kill('SIGTERM');
            serverProcess = null;
          }
          if (mainWindow) {
            mainWindow.close();
            mainWindow = null;
          }
          createSetupWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit PhoneLink Hub',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Tray initialization skipped:', err.message);
  }
}

ipcMain.handle('get-config', async () => {
  const settings = loadSettings();
  return {
    port: settings.port || 5000,
    remember: settings.remember || false,
    localIp: getLocalIP()
  };
});

ipcMain.handle('get-version', async () => {
  return app.getVersion();
});

ipcMain.on('start-server', (event, { port, remember }) => {
  const settings = { port, remember };
  saveSettings(settings);

  startBackendServer(port, () => {
    createMainWindow(port);
    setupTray();
  });
});

ipcMain.on('switch-port', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  createSetupWindow();
});

app.whenReady().then(() => {
  const settings = loadSettings();
  if (settings.remember && settings.port) {
    startBackendServer(settings.port, () => {
      createMainWindow(settings.port);
      setupTray();
    });
  } else {
    createSetupWindow();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else if (!setupWindow) {
    createSetupWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
