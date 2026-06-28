const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#1e1f26',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Mikrofon erisimi icin
      sandbox: false,
    },
  });

  win.loadFile('index.html');
}

// Mikrofon izni isteklerini otomatik onayla (sadece bu uygulama icin)
app.commandLine.appendSwitch('enable-features', 'WebRTC-H264WithOpenH264FFmpeg');

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
