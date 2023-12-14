const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const axios = require("axios")
const ejs = require('ejs');
const {handleEpub, fetchChapter} = require("./epub")


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
    const restructuredName = replace_spaces(file.originalname);

    const newPath = `books/${restructuredName}`;

    fs.rename(oldPath, newPath, async (err) => {
        if (err) {
            res.status(500).send('Failed to save the file!');
        } else {
            const response = await axios.get(`http://localhost:9999/books/${restructuredName}`);
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
    let filename = replace_spaces(req.params.filename);
    const filePath = path.join(__dirname, 'books', filename);
    const createBookPath = await checkFilePath(filePath);

    if(createBookPath === 'ok') {
        const html = await handleEpub(filePath, filename);
        // 获取meta flow生成首页
        const isDone = await handleCover(html.meta, html.flows);
        res.send(isDone);
    } else {
        res.status(500).send('获取书本失败');
    }

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
        if(!e) {
            res.sendStatus(200)
        } else {
            res.sendStatus(500)
        }
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
    const bookTitle = replace_spaces(meta.title)
    const cover_path = path.join(__dirname,'project','views','cover.ejs');
    const cover_html_path = path.join(__dirname,'project','views','cover.html');
    const chapter_note_path = path.join(__dirname,'notes',`${bookTitle}.txt`);
    const this_book_folder = path.join(__dirname,'htmls', bookTitle);
    const ids = flows.map(f => f.id);
    return new Promise(async (resolve, reject) => {
        try {
            const template = fs.readFileSync(cover_path, 'utf8');
            const data = {
                title: bookTitle,
                content: bookTitle,
                author: meta.creator,
                flows,
            };
            const html = ejs.render(template, data);
            // 写封面页
            await fs.writeFileSync(cover_html_path, html, 'utf8');
            // 生成notes和分页html；
            const writeNotesPath = await checkFilePath(chapter_note_path);
            const writePagesPath = await checkFilePath(this_book_folder);
            if(writeNotesPath !== 'ok' || writePagesPath !== 'ok'){
                throw Error('生成notes或者分页htmls出错');
            }
            const res = await checkChaptersExists(this_book_folder, ids.length);
            if(res === 'ok') {
                resolve('done');
            }
            else {
                const allChaps = flows.map(async(flow,idx) => {
                    return handleChapter(flow.id, bookTitle,ids,idx)
                })
                await handleAllChapters(allChaps)
                resolve('done');
            }


        } catch (e) {
            reject(`生成页面出错:${e}`);
        }
    })
}

const handleAllChapters = (a) => {
    Promise.all(a).catch(error => {
            console.error('promise all chapters wrong', error);
        });

}
const checkChaptersExists = (path, nums) => {
    return new Promise((resolve, reject) => {
        try {
            fs.readdir(path, (err, files) => {
                resolve(files.length === nums ? 'ok' : false)
            });
        } catch (e) {
            reject(e)
        }
    })
}
const handleChapter = async (id, title, ids,idx) => {
    return new Promise(async (resolve, reject) => {
        try {
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
            resolve('ok')
        } catch (e) {
            reject(`生成章节html出错: ${e}`)
        }
    })
}

const replace_spaces = str => {
    return str.replace(/[\s:]+/g, '_');
}
const checkFilePath = async (path) =>{
    return new Promise(async (resolve, reject) => {
        try {
            await fs.exists(path,async (exists)=>{
                if(!exists){
                    await fs.mkdir(path,{recursive:true},(e)=>{
                        if(!e) {
                            resolve('ok')
                        } else {
                            throw(`创建${path}失败,${e}`)
                        }

                    });
                } else {
                    resolve('ok');
                }
            })
        } catch (e) {
            reject(e);
        }

    })

}

const run = () => {
    app.listen('9877',()=>{
        console.log("server is running now!")
    })
}
run()

// module.exports = {run}
