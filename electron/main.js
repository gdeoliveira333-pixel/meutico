const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

let mainWindow = null
let backendProcess = null

// Caminho do backend empacotado
function getBackendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'meu-tico-server.exe')
  }
  // Dev: roda python diretamente
  return null
}

function startBackend() {
  const exePath = getBackendPath()

  if (exePath) {
    backendProcess = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      windowsHide: true,
    })
  } else {
    // Modo desenvolvimento: sobe uvicorn
    const backendDir = path.join(__dirname, '..', 'backend')
    backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
      cwd: backendDir,
      windowsHide: true,
      shell: true,
    })
  }

  backendProcess.stdout?.on('data', d => console.log('[backend]', d.toString()))
  backendProcess.stderr?.on('data', d => console.error('[backend]', d.toString()))
}

function waitForBackend(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get('http://localhost:8000/health', (res) => {
        if (res.statusCode === 200) resolve()
        else if (n > 0) setTimeout(() => check(n - 1), 1000)
        else reject(new Error('Backend não iniciou'))
      }).on('error', () => {
        if (n > 0) setTimeout(() => check(n - 1), 1000)
        else reject(new Error('Backend não iniciou'))
      })
    }
    check(retries)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'Meu Tico',
  })

  // Abre links externos no browser padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    const indexPath = path.join(process.resourcesPath, 'frontend', 'index.html')
    mainWindow.loadFile(indexPath)
  } else {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  startBackend()

  try {
    await waitForBackend()
  } catch (e) {
    console.error('Backend falhou ao iniciar:', e.message)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})
