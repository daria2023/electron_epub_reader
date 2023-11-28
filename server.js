const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const axios = require("axios")
const ejs = require('ejs');


const app = express();
const upload = multer({ dest: 'books/' ,fileFilter(req, file, callback) {
        file.originalname = Buffer.from(file.originalname, "latin1").toString(
            "utf8"
        );
        callback(null, true);
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }});

const {handleEpub, fetchChapter} = require("./epub")

const { StringDecoder } = require('node:string_decoder');



app.set('view engine', 'ejs');
app.use(express.static('project'));

// 获取首页
app.get("/", (req,res) =>{
    res.sendFile('project/index.html')
})

// 上传文档
app.post("/", upload.single('file'), (req,res) =>{
    const file = req.file;

    const oldPath = file.path;
    const newPath = `books/${file.originalname}`;

    fs.rename(oldPath, newPath, async (err) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            const response = await axios.get(`http://localhost:9999/books/${file.originalname}`);
            const data = await response.data;
            if(data === 'done') {
                res.status(200).send('ok');
            }
        }
    });

})
// 从本地读取文档
const this_html = {
    meta: null,
    flows: null,
    ids:null,
}
app.get('/books/:filename', async (req,res) => {
    let filename = req.params.filename;
    const filePath = path.join(__dirname, 'books', filename);
    // 从书本中获取epub信息；
    const html = await handleEpub(filePath);
    this_html.meta = html.meta;
    this_html.flows = html.flows;
    // 获取meta flow生成首页
    const isDone = await handleCover(html.meta, html.flows);
    res.send(isDone);
})
app.get("/list", (req,res) => {
    fs.readdir(path.join(__dirname, 'books'),(err, files)=>{
        res.send(JSON.stringify(files));
    });
})
app.get("/notes",(req,res) => {
    fs.readdir(path.join(__dirname, 'notes'), (err, files) => {
        res.send(JSON.stringify(files));
    });
})
app.get("/cover", (req,res) =>{
    res.sendFile(path.join(__dirname,'project','views','cover.html'))
})
app.get("/show-note", (req,res) =>{
    res.sendFile(path.join(__dirname,'project','views','note.html'))
})
app.get("/htmls/:title/:id", async (req,res) =>{
    const title = decodeURIComponent(req.params.title)
    res.sendFile(path.join(__dirname,'htmls',title,`${req.params.id}.html`));
})


app.get('/notes/:filename', async (req,res) => {
    let filename = req.params.filename;
    const filePath = path.join(__dirname, 'notes', filename);
    const note = fs.readFileSync(filePath,'utf-8');
    await handleNote(note);
    res.sendFile(filePath)
})

app.get('/images/*', async (req,res) => {
    const requestedPath = req.params[0];
    const fullPath = path.join(__dirname, 'images', requestedPath);
    res.sendFile(fullPath);
})

app.post('/notes', upload.single('file'),async (req, res)=>{
    const { title, content } = req.body;
    const txtPath = path.join(__dirname,'notes', `${title}.txt`);
    const passed = `\r\n ${content} \r\n --${new Date().toTimeString()} \r\n`;
    await fs.appendFile(txtPath, passed,'utf-8',(e)=>{
        console.log(e)
    });

})

const handleNote = async (note) =>{
    const note_path = path.join('project','views','note.ejs');
    const note_html_path = path.join('project','views','note.html')
    const template = fs.readFileSync(note_path, 'utf8');

    const data = {
        content: note,
    };

    const html = ejs.render(template, data);
    await fs.writeFileSync(note_html_path, html, 'utf8');
    return 'done';
}
const handleCover = async (meta, flows) => {
    const cover_path = path.join('project','views','cover.ejs');
    const cover_html_path = path.join('project','views','cover.html');
    const template = fs.readFileSync(cover_path, 'utf8');
    // 利用传进来的meta和flow生成模板 cover页

    const data = {
        title: meta.title,
        content: meta.title,
        author: meta.creator,
        flows,
    };
    const html = ejs.render(template, data);
    await fs.writeFileSync(cover_html_path, html, 'utf8');
    const chapter_note_path = path.join('notes',`${meta.title}.txt`);
    const this_book_folder = path.join('htmls', meta.title);
    await fs.exists(chapter_note_path,async (exists)=>{
        if(!exists){
            await fs.writeFileSync(chapter_note_path,'');
        }
    })
    await fs.exists(this_book_folder,async (exists)=>{
        if(!exists){
            await fs.mkdir(this_book_folder,{},(e)=>{
                console.log(e)
            });
        }
    })


    const ids = flows.map(f => f.id);

    flows.map(async(flow,idx) => {
        await handleChapter(flow.id, meta.title,ids,idx)
    })
    return 'done';
}


const handleChapter = async (id, title, ids,idx) => {
    const chapter_path = path.join('project','views','chapter.ejs');
    const chapter_html_path = path.join('htmls',title,`${id}.html`)
    const template = fs.readFileSync(chapter_path, 'utf8');

    const prevId = idx - 1 < 0 ? ids[0] : ids[idx - 1];
    const nextId = idx + 1 > ids.length - 1 ? ids[ids.length - 1] : ids[idx+1];
    const content = await fetchChapter(id);
    const data = {
        title: title,
        content: content,
        id,
        prevId,
        nextId,
    };

    const html = ejs.render(template, data);
    await fs.writeFileSync(chapter_html_path, html, 'utf8');
    return 'done';
}


const run = () => {
    app.listen('9999',()=>{
        console.log("server is running now!")
    })
}

module.exports = {run}
