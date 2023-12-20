const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const ejs = require("ejs");
const Parser = require("./util/parser");
const {
  isFolderExist,
  readFolder,
  replace_spaces,
  reduceFileType,
} = require("./util/folder");
const {
  handleBook,
  ejsRender,
  handleBookContent,
  handleBookImgs,
  checkLocalFile,
  saveLocalFile,
} = require("./util/bookHandler");
require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("static"));
const upload = multer({
  dest: "books/",
  fileFilter(req, file, callback) {
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );
    callback(null, true);
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const staticHolder = path.join(__dirname, "static");
const booksHolder = path.join(__dirname, "books");
const notesHolder = path.join(__dirname, "notes");
const ejsModelHolder = path.join(staticHolder, "models");
const ejsGeneratedHolder = path.join(staticHolder, "generated");
const imgsHolder = path.join(staticHolder, "imgs");
const bookHolderJson = path.join(staticHolder, "holder.json");

// 首页面获取
app.get("/", (req, res) => {
  const indexPage = path.join(staticHolder, "index.html");
  res.sendfile(indexPage);
});
// 首页上传文档：
app.post("/", upload.single("file"), (req, res) => {
  const file = req.file;
  const oldPath = file.path;
  const restructuredName = replace_spaces(file.originalname);

  const newPath = `books/${restructuredName}`;

  fs.rename(oldPath, newPath, async (err) => {
    if (err) {
      res.status(500).send("Failed to save the file!");
    }
    res.status(200).send("ok");
  });
});

// 信息页获取
app.get("/info/:bookName", async (req, res) => {
  const decodeName = decodeURIComponent(req.params.bookName);
  const bookPath = path.join(booksHolder, decodeName);
  const info_ejs_path = path.join(ejsModelHolder, "info.ejs");
  const info_generated_path = path.join(ejsGeneratedHolder, "info.html");

  const bookName = reduceFileType(decodeName);
  const bookImgHolder = path.join(imgsHolder, bookName);

  const hasLoaded = await checkLocalFile(bookHolderJson, bookName);
  if (hasLoaded.code === 200) {
    const bookInfo = hasLoaded.data;
    await renderFile(bookInfo);
  } else {
    const book = new Parser(bookPath);
    const bookInfo = await handleBook(book);
    const imgs = await handleBookImgs(book, bookImgHolder);
    if (bookInfo.code === 200 && imgs.code === 200) {
      bookInfo.data.localName = bookName;
      await saveLocalFile(bookHolderJson, bookName, bookInfo.data);
      await renderFile(bookInfo.data);
    } else {
      res.send({ code: 400, msg: "No info found!" });
    }
  }

  async function renderFile(bookInfo) {
    const ejsGenerated = await ejsRender(
      ejs,
      info_ejs_path,
      info_generated_path,
      bookInfo,
    );
    if (ejsGenerated === 200) {
      res.sendFile(info_generated_path);
    } else {
      res.send({ code: 400, msg: "No info found!" });
    }
  }
});

// 阅读页获取

app.get("/ing/*", async (req, res) => {
  const paths = req.params[0].split("/");
  const requestedBook = paths[0];
  const requestedChapter = paths.slice(1).join("/");

  const bookPath = path.join(booksHolder, `${requestedBook}.epub`);
  const chapter = requestedChapter;
  const chapter_ejs_path = path.join(ejsModelHolder, "chapter.ejs");
  const chapter_generated_path = path.join(ejsGeneratedHolder, "chapter.html");
  const hasLoaded = await checkLocalFile(bookHolderJson, requestedBook);
  const loadedInfo = await hasLoaded.data["menu"];
  const findMenu = findInMenu(loadedInfo, chapter);

  const book = new Parser(bookPath);
  const bookChapter = await handleBookContent(book, chapter, requestedBook);

  if (bookChapter.code === 200) {
    const data = {
      content: bookChapter.content,
      title: requestedBook,
      prev: findMenu.prev,
      next: findMenu.next,
    };
    const ejsGenerated = await ejsRender(
      ejs,
      chapter_ejs_path,
      chapter_generated_path,
      data,
    );
    if (ejsGenerated === 200) {
      res.sendFile(chapter_generated_path);
    }
  } else {
    res.send({ code: 400, msg: "No Chapter found!" });
  }

  function findInMenu(menu, req) {
    const len = menu.length;

    const findout = menu.find((item) => item.src.includes(req));
    const idx = menu.indexOf(findout);
    const prev = prevChapter(idx);
    const next = nextChapter(idx);

    return {
      prev,
      next,
    };
    function prevChapter(idx) {
      const lastIdx = idx - 1 <= 0 ? 0 : idx - 1;
      return menu[lastIdx];
    }
    function nextChapter(idx) {
      const nextIdx = idx + 1 >= len - 1 ? len - 1 : idx + 1;
      return menu[nextIdx];
    }
  }
});

// image 获取
app.get("/image/:bookName/:imgId", async (req, res) => {
  const bookImgsFolder = path.join(imgsHolder, req.params.bookName);
  const theImgPath = path.join(bookImgsFolder, req.params.imgId);
  res.sendFile(theImgPath);
});
// 进入首页接口管理
app.get("/books", async (req, res) => {
  const files = await readFolder(booksHolder);
  if (files && files.length > 0) {
    res.send({
      code: 200,
      data: files,
    });
  } else {
    res.send({
      code: 200,
      data: [],
    });
  }
});

app.get("/notes", async (req, res) => {
  const files = await readFolder(notesHolder);
  if (files && files.length > 0) {
    res.send({
      code: 200,
      data: files,
    });
  } else {
    res.send({
      code: 200,
      data: [],
    });
  }
});

// 获取书本信息

app.get("/read/:name", async (req, res) => {
  let filename = decodeURIComponent(req.params.name);
  const filePath = path.join(__dirname, "books", filename);
  const fileExist = await isFolderExist(filePath);
  if (fileExist === 200) {
    res.send({ code: 200 });
  } else {
    res.send({
      code: 404,
      msg: "The requested file is not existed!",
    });
  }
});

const serve = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server has been running on ${port}`);
  });
  const handleErr = () => server.listen(++port);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      handleErr();
    }
  });
};
// serve(process.env.PORT);

module.exports = serve;
