const { app, BrowserWindow, Menu, ipcMain, globalShortcut } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  registerGlobalShortcuts();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function registerGlobalShortcuts() {
  // تسجيل اختصارات عالمية
  globalShortcut.register('Alt+J', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // تسجيل اختصار لتفعيل الميكروفون
  globalShortcut.register('Ctrl+Shift+V', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('start-voice-input');
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'خروج',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        {
          label: 'تكبير',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) {
              const zoomLevel = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(zoomLevel + 1);
            }
          },
        },
        {
          label: 'تصغير',
          accelerator: 'CmdOrCtrl+Minus',
          click: () => {
            if (mainWindow) {
              const zoomLevel = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(zoomLevel - 1);
            }
          },
        },
        {
          label: 'إعادة تعيين الحجم',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          },
        },
      ],
    },
    {
      label: 'أدوات',
      submenu: [
        {
          label: 'أدوات المطور',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'عن JARVIS',
          click: () => {
            // يمكن إضافة نافذة معلومات هنا
          },
        },
        {
          label: 'التوثيق',
          click: () => {
            require('electron').shell.openExternal(
              'https://github.com/yourusername/jarvis-ai'
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// معالج IPC لاستقبال الرسائل من React
ipcMain.on('voice-command', (event, arg) => {
  console.log('Voice command received:', arg);
  // يمكن إضافة معالجة إضافية هنا
});
