const { app, BrowserWindow} = require("electron");
const run = require("./serve");
const { PORT } = require("./cfg");

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    darkTheme: true,
    title: `epub-reader`,
    icon: "/favicon.ico",
  });
  await win.loadURL(`http:localhost:${PORT}`);

};

app.whenReady().then(async () => {
  await run(PORT);
  await createWindow();
  // app.isPackaged
});
