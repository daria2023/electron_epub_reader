const fs = require("fs");
const { isFolderExist } = require("./folder");

const handleBook = (book, bookImg) => {
  book.init();
  return new Promise((resolve, reject) => {
    try {
      book.getBookInfo().then((info) => {
        book.getMenu().then((menu) => {
          if (menu.length === 0) {
            book.getSpine().then((spine) => {
              info.menu = spine.map((s) => {
                return {
                  src: s.href,
                  text: s.id,
                };
              });

              resolve({
                code: 200,
                data: info,
              });
            });
          } else {
            info.menu = menu;
            resolve({
              code: 200,
              data: info,
            });
          }
        });
      });
    } catch (e) {
      console.log(123, e);
      // reject(e)
    }
  });
};

const handleBookImgs = (book, bookImg) => {
  book.init();

  return new Promise((resolve, reject) => {
    try {
      isFolderExist(bookImg).then(() => {
        book.getImgs(bookImg).then((is) => {
          resolve({
            code: 200
          });
        });
      });
    } catch (e) {
      resolve({
        code: 400,
        msg: "parse imgs failed",
      });
    }
  });
};

const handleAllImgs = (book,bookImg) =>{
  book.init();

  return new Promise((resolve, reject) => {
    try {
      isFolderExist(bookImg).then(() => {
        book.getImgEntites(bookImg).then((is) => {
          resolve(is);
        });
      });
    } catch (e) {
      resolve({
        code: 400,
        msg: "parse imgs failed",
      });
    }
  });
}

const handleBookContent = (book, chapter, bookName) => {
  book.init();
  return new Promise(async (resolve, reject) => {
    try {
      const received = await book.getChapter(chapter);
      resolve({
        code: 200,
        content: received,
      });
    } catch (e) {
      resolve({
        code: 400,
        msg: "Cant get the chapter",
      });
    }
  });
};

const ejsRender = (ejs, modelPath, generatedPath, passedData) => {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(modelPath, "utf-8", async (err, ejsModelString) => {
        const html = await ejs.render(ejsModelString, passedData);
        await fs.writeFile(generatedPath, html, "utf-8", () => {
          resolve(200);
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};

const checkLocalFile = (path, param, bookName) => {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(path, { encoding: "utf-8" }, (err, data) => {
        const jsonFile = JSON.parse(data);
        const isLoaded = jsonFile[param][bookName];
        if (isLoaded) {
          resolve({
            code: 200,
            value: true,
            data: jsonFile[param][bookName],
          });
        } else {
          resolve({
            code: 400,
            value: false,
          });
        }
      });
    } catch (e) {
      resolve({
        code: 400,
        value: false,
      });
    }
  });
};

const saveLocalFile = (path, param, bookName, passedData) => {
  return new Promise((resolve, reject) => {
    try {
      fs.readFile(path, { encoding: "utf-8" }, (err, data) => {
        const saved = JSON.parse(data);
        saved[param][bookName] = passedData;
        fs.writeFile(
          path,
          JSON.stringify(saved),
          { encoding: "utf-8" },
          (err) => {
            resolve({
              code: 200,
            });
          },
        );
      });
    } catch (e) {
      resolve({
        code: 400,
        value: false,
      });
    }
  });
};

module.exports = {
  handleBook,
  ejsRender,
  handleBookContent,
  handleBookImgs,
  checkLocalFile,
  saveLocalFile,
  handleAllImgs
};
