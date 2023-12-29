const { app, BrowserWindow, Tray} = require("electron");
const path = require("path");
const run = require("./serve");
const { PORT } = require("./cfg");


const icon = path.join(__dirname, 'favicon.ico')

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    darkTheme: true,
    title: `epub-reader`,
    icon,
  });
  try{
    win.loadURL(`http:localhost:${PORT}`);
  } catch (e) {
    console.log('can not url',e)
  }
};


app.whenReady().then(async () => {
  await run(PORT);
  await createWindow();
  const appIcon = new Tray(icon);

});
