const { app, BrowserWindow, Tray, Menu, shell, globalShortcut, session, nativeImage } = require('electron');
const path = require('path');

const ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACkElEQVR4nO2V20tUYRTF5z8TTEILS+xGhJGokBWFmXltxDTxkiHaBamk0MKgjCCpiCgCQUEipAfBFyFwZs7cnDmjU1qs+J1xUGIuR2fEl7Nhw8f+Ps7aa+3Lcbkcc8yxXdhM75qmu1f1pTOmj25TU81Rvb4W0Z4Dzw/FhX8fjGtuYE0k8rVr1UribVNUr65G9OxiOP+J/Bj+pYUHv7U4knDOxL7diVtJoMSHNlNvGqJ6cWVFT8+HNXIumJ9EAAJ0aXRdP59sWM6ZGHcoQTk+tccsFV7WRTR+IayHVSENnwmkTELz68u2E4AtgJ7xDQUm/ljOmRh3lAMVPnfE9K7F1GR9ogyPq0O6W7GVAKDb3RY49YYprAE2J/9azpkYd7yZ7UuU4X2raTXj80srGq0J6V5FULdP+vU/uO0k9jUBZEXeXEvQf8KvziO+lElkTIDGosFybcK+4351lG4lYKv2GJLCjFHb7RgOng6op9xQ+2HfzkeS5cKSAQCWSG13EVH/+2eDGjjl160yQzdKvPYTSErFeuXDsENiwGg2PN0qnri8yb4yqKFN+W+W+tRyMEsCqRqED8IKaakvTQYgzpkYd7zhLdKP1Yb1qCrR/bDvLjPkPuTV9QOenSeAIyl1BYQOZ8xwzsS44w3MAafzkZ7a9x4zrObLyj5TAtQTZnQ24wVTnDMx7niD7DBPgiM9o9dW7FVDYRb26ZJIxvk4YwUQCwbnTIw7Go6aI3sSvOuoIXeJV41FNsFdGX4QjBMzjbyA4ZyJcQdrGo6aIzvMAW8q8qiuYDk/f0QWClsNljhnYjAGGNY0HDVH9sZ8gm839jrOegWUJcOcM2p0Ow1nu+a5GDLDlg3HkgE466g55phjaewfDFGCowTV0NQAAAAASUVORK5CYII=';
const ICON = () => { const i = nativeImage.createFromPath(path.join(__dirname, 'www', 'icon.png')); return i.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,' + ICON_B64) : i; };
const TRAY = () => ICON().resize({ width: 16, height: 16 });
const PAGE = path.join(__dirname, 'www', 'index.html');
let win = null, tray = null, quitting = false;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => showWin());
function showWin() { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 820, minWidth: 420, minHeight: 600,
    title: 'Учёба', icon: ICON(), backgroundColor: '#070718', autoHideMenuBar: true, show: false,
    // webSecurity off: the page is a local file that calls AI APIs directly
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: true, webSecurity: false }
  });
  win.loadFile(PAGE);
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F5') { win.reload(); e.preventDefault(); }
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

function createTray() {
  tray = new Tray(TRAY());
  tray.setToolTip('Учёба — Ctrl+Alt+U');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть', click: showWin },
    { type: 'separator' },
    { label: 'Автозапуск с Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', () => (win.isVisible() && win.isFocused()) ? win.hide() : showWin());
}

app.setAppUserModelId('ru.ucheba.app');
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write'].includes(perm)));
  createWindow();
  createTray();
  globalShortcut.register('Control+Alt+U', () => (win.isVisible() && win.isFocused()) ? win.hide() : showWin());
});
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {});
