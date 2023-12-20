const { app, BrowserWindow } = require("electron");
const run = require("./serve");

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    darkTheme: true,
    title: `epub-reader`,
    icon: "/favicon.ico",
  });
  await win.loadURL(`http:localhost:${process.env.PORT}`);
};

app.whenReady().then(async () => {
  await run(process.env.PORT);
  await createWindow();
});

// const handleSelect = () => {
//   if (!document.getSelection().toString().trim()) return;
//   const selected_txt_El = document.getSelection().anchorNode.parentElement;
//   const selected_txt = document.getSelection().toString();
//   const whole_txt = selected_txt_El.innerText;
//   const segments = whole_txt.split(selected_txt);
//   const newArray = [segments[0], selected_txt, segments[1]];
//   splitEl(selected_txt_El, newArray);
//   storeTxts(selected_txt);
// };
//
// const splitEl = (el, txts) => {
//   el.innerHTML = "";
//   const start = document.createElement("span");
//   start.innerHTML = txts[0] ?? "";
//   const the_selected = document.createElement("span");
//   the_selected.innerHTML = txts[1] ?? "";
//   the_selected.classList.add("selected");
//   const end = document.createElement("span");
//   end.innerHTML = txts[2] ?? "";
//   el.append(start, the_selected, end);
// };
//
// const storeTxts = async (txt) => {
//   const titleValue = localStorage.getItem("title");
//   const formData = new FormData();
//   formData.append("title", titleValue);
//   formData.append("content", txt);
//
//   const res = await fetch(`/notes`, {
//     method: "post",
//     body: formData,
//   });
//   console.log(res);
// };
// document.addEventListener("mouseup", handleSelect);
