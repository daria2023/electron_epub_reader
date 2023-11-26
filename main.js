const { app, BrowserWindow } = require('electron')
const { run } = require("./server")

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        darkTheme: true
    })
    win.loadURL('http://localhost:9999');
}

app.whenReady().then(async () => {
    await run();
    createWindow()
})