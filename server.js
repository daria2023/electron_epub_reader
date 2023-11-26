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


app.set('view engine', 'ejs');

app.use(express.static('project'))

app.get("/", (req,res) =>{
    res.sendFile('project/index.html')
})
app.get("/list", (req,res) => {
    fs.readdir(path.join(__dirname, 'books'),(err, files)=>{
        res.send(JSON.stringify(files));
    });
})
app.get("/cover", (req,res) =>{
    res.sendFile(path.join(__dirname,'project','views','cover.html'))
})
app.get("/chapter/:id", async (req,res) =>{
    const chapter_id = req.params.id;
    const isDone = await handleChapter(chapter_id);
    if(isDone === 'done') {
        res.sendFile(path.join(__dirname,'project','views','chapter.html'))
    }
})
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
const this_html = {
    meta: null,
    flows: null,
    ids:null,
}
app.get('/books/:filename', async (req,res) => {
    let filename = req.params.filename;
    const filePath = path.join(__dirname, 'books', filename);
    const html = await handleEpub(filePath);
    this_html.meta = html.meta;
    this_html.flows = html.flows;
    const isDone = await handleCover(this_html.meta, this_html.flows);
    res.send(isDone);
})

app.get('/images/*', async (req,res) => {
    const requestedPath = req.params[0];
    const fullPath = path.join(__dirname, 'images', requestedPath);
    res.sendFile(fullPath);
})
const handleCover = async (meta, flows) => {
    const cover_path = path.join('project','views','cover.ejs');
    const cover_html_path = path.join('project','views','cover.html')
    const template = fs.readFileSync(cover_path, 'utf8');
    const ids = flows?.map(flow => {
        return flow.id
    })
    this_html.ids = ids;
    const data = {
        title: meta.title,
        content: meta.title,
        author: meta.creator,
        flows,
        ids,
    };
    const html = ejs.render(template, data);
    await fs.writeFileSync(cover_html_path, html, 'utf8');
    return 'done';
}

const handleChapter = async (id) => {
    const chapter_path = path.join('project','views','chapter.ejs');
    const chapter_html_path = path.join('project','views','chapter.html')
    const template = fs.readFileSync(chapter_path, 'utf8');

    const chapterIndex = this_html.ids.indexOf(id);
    const prevId = chapterIndex - 1 < 0 ? this_html.ids[0] : this_html.ids[chapterIndex - 1];
    const nextId = chapterIndex + 1 > this_html.ids.length - 1 ? this_html.ids[this_html.ids.length - 1] : this_html.ids[chapterIndex + 1];
    const content = await fetchChapter(id);
    const data = {
        title: this_html.title,
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
// run();
module.exports = {run}
