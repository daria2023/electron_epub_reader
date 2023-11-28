const { app, BrowserWindow } = require('electron')
const { run } = require("./server")

const createWindow = async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        darkTheme: true,
        title:`epub-reader`,
        icon:"/favicon.ico",
    })
    await win.loadURL('http://localhost:9999');
}

app.whenReady().then(async () => {
    await run();
    await createWindow()
})