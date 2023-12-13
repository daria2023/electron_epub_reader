const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const ejs = require('ejs');
const Parser = require("./parser");
const { isFolderExist, readFolder, replace_spaces } = require("./util/folder")
const { handleBook } = require("./util/bookHandler")



const app = express();
app.set('view engine', 'ejs');
app.use(express.static('static'));


const staticHolder = path.join(__dirname,'static');
const booksHolder = path.join(__dirname,'books');
const notesHolder = path.join(__dirname,'notes');


// 首页面获取
app.get('/', (req, res) => {
    const indexPage = path.join(staticHolder,'index.html');
    res.sendfile(indexPage)
})

// 信息页获取
app.get('/info/:bookName', async (req, res) => {
    let filename = replace_spaces(req.params.bookName);
    console.log(111,req.params.bookName)
    const filePath = path.join(__dirname, 'books', filename);
    const fileExist = await isFolderExist(filePath);
    console.log(fileExist);
})

// 进入首页接口管理
app.get('/books', async (req, res) => {
    const files = await  readFolder(booksHolder);
    if(files && files.length > 0) {
        res.send({
            code: 200,
            data:files
        })
    } else {
        res.send({
            code: 200,
            data: [],
        })
    }
})

app.get('/notes', async (req, res) => {
    const files = await readFolder(notesHolder);
    if(files && files.length > 0) {
        res.send({
            code: 200,
            data:files
        })
    } else {
        res.send({
            code: 200,
            data: [],
        })
    }
})

// 获取书本信息

app.get('/read/:name', async (req, res) => {
    let filename = replace_spaces(req.params.name);
    const filePath = path.join(__dirname, 'books', filename);
    const fileExist = await isFolderExist(filePath);
    if(fileExist === 200){
        res.send({code: 200})
    } else {
        res.send({
            code: 404,
            msg:"The requested file is not existed!"
        })
    }

})
app.listen( 9877, () => {
    console.log("the serve is running on the port 9877")
})


