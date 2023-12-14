const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const ejs = require('ejs');
const Parser = require("./parser");
const { isFolderExist, readFolder, replace_spaces } = require("./util/folder")
const { handleBook, ejsRender } = require("./util/bookHandler")
require('dotenv').config()



const app = express();
app.set('view engine', 'ejs');
app.use(express.static('static'));


const staticHolder = path.join(__dirname,'static');
const booksHolder = path.join(__dirname,'books');
const notesHolder = path.join(__dirname,'notes');
const ejsModelHolder = path.join(staticHolder,'models');
const ejsGeneratedHolder = path.join(staticHolder,'generated')


// 首页面获取
app.get('/', (req, res) => {
    const indexPage = path.join(staticHolder,'index.html');
    res.sendfile(indexPage)
})

// 信息页获取
app.get('/info/:bookName', async (req, res) => {
    const bookPath = path.join(booksHolder,req.params.bookName)
    const info_ejs_path = path.join(ejsModelHolder,'info.ejs');
    const info_generated_path = path.join(ejsGeneratedHolder,'info.html');

    const book = new Parser(bookPath);
    const bookInfo  = await handleBook(book);
    if(bookInfo.code === 200) {
        // console.log(bookInfo.data.menu)
        const ejsGenerated = await ejsRender(ejs,info_ejs_path,info_generated_path,bookInfo.data)
        if(ejsGenerated === 200){
            res.sendFile(info_generated_path);
        }

    } else {
        res.send({code: 400, msg: 'No info found!'})
    }

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


const serve = (port) => {
    const server = app.listen(port,()=>{
        console.log(`Server has been running on ${port}`)
    });
    const handleErr = ()=> server.listen(++port)
    server.on('error',(err)=>{
        if(err.code === 'EADDRINUSE') {
            handleErr();
        }
    })
}
serve(process.env.PORT);

