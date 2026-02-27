import { app, BrowserWindow, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { autoUpdater } from 'electron-updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    title: 'ECHO', 
    autoHideMenuBar: true, 
    // Задаем минимальные размеры, чтобы верстка не ломалась при сжатии
    minWidth: 900,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'), // Пока оставляем твою иконку по умолчанию
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // ВАЖНО: Разрешаем медиа-ресурсы, если приложение работает локально (нужно для WebRTC)
      webSecurity: false 
    },
  })

  // ==========================================
  // ВАЖНО: Разрешения для WebRTC (Камера и Микрофон)
  // Без этого блока звонки в собранном приложении работать не будут!
  // ==========================================
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ['media', 'camera', 'microphone']
    if (allowedPermissions.includes(permission)) {
      callback(true)
    } else {
      callback(false)
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // ==========================================
  // Настройка Автообновлений
  // Проверяет релизы на GitHub при каждом запуске
  // ==========================================
  win.once('ready-to-show', () => {
    // В режиме разработки не проверяем, чтобы не сыпались ошибки в консоль
    if (!app.isPackaged) return
    
    autoUpdater.checkForUpdatesAndNotify()
  })
}

// Слушатели событий автообновления для логирования (можно смотреть в терминале)
autoUpdater.on('update-available', () => {
  console.log('Найдено обновление. Скачивание...')
})

autoUpdater.on('update-downloaded', () => {
  console.log('Обновление скачано. Установка и перезапуск...')
  // Когда скачалось - тихо закрывает приложение, ставит апдейт и открывает снова
  autoUpdater.quitAndInstall()
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
