const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
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
const { PORT } = require("./cfg");


const app = express();
app.set("view engine", "ejs");
app.use(express.static("static"));

// const outAppAsar = path.join(__dirname,'..');
const outAppAsar = __dirname;
const staticHolder = path.join(__dirname, "static");
const booksHolder = path.join(outAppAsar, "books");
const notesHolder = path.join(outAppAsar, "notes");
const ejsModelHolder = path.join(staticHolder, "models");
const ejsGeneratedHolder = path.join(staticHolder, "generated");
const imgsHolder = path.join(outAppAsar, "imgs");
const bookHolderJson = path.join(outAppAsar, "holder.json");

const booksAndParser = new Map();

const upload = multer({
  dest: booksHolder,
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

app.all('*', function (req, res, next) {
  const requestedFile = req.url.split('/');
  const len = requestedFile.length;
  const lastPath = requestedFile[len - 1];
  if(lastPath.endsWith('.css')|| lastPath.endsWith('.js') || lastPath.endsWith('.ico') ){
    res.sendFile(path.join(staticHolder,lastPath));
  } else {
    next()
  }
})
app.get("/", (req, res) => {
  const indexPage = path.join(staticHolder, "index.html");
  res.sendFile(indexPage);
});
// 首页上传文档：
app.post("/", upload.single("file"), (req, res) => {
  const file = req.file;
  const oldPath = file.path;
  const restructuredName = replace_spaces(file.originalname);
  const newPath = path.join(booksHolder,restructuredName)
  fs.rename(oldPath, newPath, async (err) => {
    if (err) {
      res.status(500).send("Failed to save the file!");
    } else {
      // 加载全书图片，首页加载loading效果
      const bookName = newPath.split('\\');
      const book = bookName.at(-1);
      fetch(`http://localhost:${PORT}/preload/${book}`).then(async (loadres)=>{
        const data = await loadres.json();
        if(data.code === 200) {
          res.send({
            code: 200
          })
        } else {
          res.send({
            code: 204,
            msg: "Imgs load failed"
          })
        }
      }).catch(err=>{
        console.log('parse img wrong, ', err);
        res.send({
          code: 204,
          msg: "Imgs load failed"
        })
      })
    }
  });
});
// 加载本书图片
app.get('/preload/:bookName', async (req, res) => {
  const decodeName = decodeURIComponent(req.params.bookName);
  const bookPath = path.join(booksHolder, decodeName);
  const bookName = reduceFileType(decodeName);
  const bookImgHolder = path.join(imgsHolder, bookName);
  const book = new Parser(bookPath);
  const imgSaved = await handleBookImgs(book, bookImgHolder);
  if(imgSaved.code === 200) {
    res.send({
      code:200
    })
  } else {
    res.send({code: 400})
  }

})
// 信息页获取
app.get("/info/:bookName", async (req, res) => {

  const decodeName = decodeURIComponent(req.params.bookName);
  const bookPath = path.join(booksHolder, decodeName);
  const info_ejs_path = path.join(ejsModelHolder, "info.ejs");
  const info_generated_path = path.join(ejsGeneratedHolder, "info.html");

  const bookName = reduceFileType(decodeName);

  const hasLoaded = await checkLocalFile(bookHolderJson, 'books',bookName);
  if (hasLoaded.code === 200) {
    const bookInfo = hasLoaded.data;
    await renderFile(bookInfo);
  } else {
    const book = checkBookMap(bookName,bookPath);
    const bookInfo = await handleBook(book);
    if (bookInfo.code === 200) {
      bookInfo.data.localName = bookName;
      await saveLocalFile(bookHolderJson, 'books',bookName, bookInfo.data);
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
  const requestedMenuIdx = paths[1];
  const requestedChapter = paths.slice(2).join("/");

  const bookPath = path.join(booksHolder, `${requestedBook}.epub`);
  const chapter = requestedChapter;
  const chapter_ejs_path = path.join(ejsModelHolder, "chapter.ejs");
  const chapter_generated_path = path.join(ejsGeneratedHolder, "chapter.html");
  const hasLoaded = await checkLocalFile(bookHolderJson, 'books',requestedBook);
  const loadedInfo = await hasLoaded.data["menu"];
  const findMenu = findInMenu(loadedInfo, chapter, requestedMenuIdx);

  const book = checkBookMap(requestedBook, bookPath);
  const bookChapter = await handleBookContent(book, chapter, requestedBook);

  if (bookChapter.code === 200) {
    const data = {
      content: bookChapter.content,
      title: requestedBook,
      prev: findMenu.prev,
      next: findMenu.next,
      index: requestedMenuIdx,
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

  function findInMenu(menu, req, idx) {
    const len = menu.length;
    const max = len - 1;
    const min = 0;
    const prev = prevChapter(+idx);
    const next = nextChapter(+idx);

    return {
      prev,
      next,
    };
    function prevChapter(idx) {
      const lastIdx = idx - 1 <= min ? min : idx - 1;
      return { ...menu[lastIdx], index: lastIdx };
    }
    function nextChapter(idx) {
      const nextIdx = idx + 1 >= max ? max : idx + 1;
      return { ...menu[nextIdx], index: nextIdx };
    }
  }
});

// image 获取
app.get("/image/:bookName/:imgId", async (req, res) => {
  const requestBookName = req.params.bookName;
  const requestId = req.params.imgId;
  const bookImgsFolder = path.join(imgsHolder, requestBookName);
  const theImgPath = path.join(bookImgsFolder, requestId);
  res.sendFile(theImgPath);
});
// 进入首页接口管理
app.get("/books", async (req, res) => {
  const r = await readFolder(booksHolder);
  if (r.code === 200 && r.files && r.files.length > 0) {
    res.send({
      code: 200,
      data: r.files,
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
  if (files.code === 200 && files.files && files.files.length > 0) {
    res.send({
      code: 200,
      data: files.files,
    });
  } else {
    res.send({
      code: 200,
      data: [],
    });
  }
});

app.post('/notes', upload.single('file'),async (req, res)=>{
  const { title, content } = req.body;
  const txtPath = path.join(notesHolder,`${title}.txt`);
  const passed = `\r\n ${content} \r\n --${new Date().toTimeString().slice(0,8) + " " + new Date().toDateString()} \r\n`;
  await fs.appendFile(txtPath, passed,'utf-8',(e)=>{
    if(!e) {
      res.sendStatus(200)
    } else {
      res.sendStatus(500)
    }
  });
})

// 获取书本信息

app.get("/read/:name", async (req, res) => {
  let filename = decodeURIComponent(req.params.name);
  const filePath = path.join(booksHolder, filename);
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

function checkBookMap(bookName, path) {
  if(booksAndParser.get(bookName)){
    return booksAndParser.get(bookName);
  } else {
    const book = new Parser(path);
    booksAndParser.set(bookName,book);
    return book;
  }
}


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

module.exports = serve;
