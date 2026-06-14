const path = require('path');
const { exec } = require('node:child_process');
const http = require('node:http');
const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const { Server } = require('socket.io');

let activeWin;
let mainWindow = null;
let chatServer = null;
let overlayVisible = false;

function createChatServer() {
  const server = http.createServer();
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connecté au serveur de chat. ID:', socket.id);

    socket.on('chat message', (message) => {
      const payload = {
        id: socket.id,
        text: message,
        time: new Date().toLocaleTimeString()
      };
      io.emit('chat message', payload);
    });

    socket.on('disconnect', () => {
      console.log('Client déconnecté:', socket.id);
    });
  });

  server.listen(3000, '127.0.0.1', () => {
    console.log('Serveur Socket.io démarré sur http://127.0.0.1:3000');
  });

  return server;
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const windowWidth = 520;
  const windowHeight = 300;
  const x = display.bounds.x + display.bounds.width - windowWidth - 16;
  const y = display.bounds.y + 16;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    show: true,
    frame: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    focusable: true,
    transparent: false,
    title: 'Roblox Chat Overlay',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setAlwaysOnTop(true, 'floating');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function positionOverlay() {
  if (!mainWindow) {
    return;
  }

  const display = screen.getPrimaryDisplay();
  const windowWidth = 360;
  const windowHeight = 360;
  let targetX = display.bounds.x + display.bounds.width - windowWidth - 24;
  let targetY = display.bounds.y + 10;

  try {
    const activeWindow = await activeWin();
    const ownerName = activeWindow?.owner?.name || '';
    if (/roblox/i.test(ownerName) && activeWindow.bounds) {
      targetX = activeWindow.bounds.x + activeWindow.bounds.width - windowWidth - 16;
      targetY = activeWindow.bounds.y + 10;
    }
  } catch (error) {
    console.warn('Impossible de récupérer la fenêtre active:', error.message);
  }

  mainWindow.setBounds({ x: Math.max(targetX, 0), y: Math.max(targetY, 0), width: windowWidth, height: windowHeight });
}

function checkRobloxRunning(callback) {
  if (process.platform !== 'win32') {
    return callback(false);
  }

  exec('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /NH', (error, stdout) => {
    if (error) {
      console.error('Erreur lors de la vérification de Roblox:', error.message);
      return callback(false);
    }

    const isRunning = stdout.toLowerCase().includes('robloxplayerbeta.exe');
    callback(isRunning);
  });
}

function watchRoblox() {
  setInterval(async () => {
    const running = await new Promise((resolve) => checkRobloxRunning(resolve));

    if (running && !overlayVisible) {
      overlayVisible = true;
      if (mainWindow) {
        await positionOverlay();
        mainWindow.show();
      }
    }

    if (!running && overlayVisible) {
      overlayVisible = false;
      if (mainWindow) {
        mainWindow.hide();
      }
    }

    if (running && overlayVisible) {
      await positionOverlay();
    }
  }, 2000);
}

ipcMain.handle('open-external', async (_event, url) => {
  if (!/^https?:\/\//i.test(url)) {
    return;
  }
  await shell.openExternal(url);
});

app.whenReady().then(async () => {
  try {
    const activeWinModule = await import('active-win');
    activeWin = activeWinModule.default || activeWinModule;
  } catch (error) {
    console.warn('Impossible de charger active-win:', error.message);
  }

  createWindow();
  chatServer = createChatServer();
  watchRoblox();

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

app.on('before-quit', () => {
  if (chatServer) {
    chatServer.close();
  }
});
