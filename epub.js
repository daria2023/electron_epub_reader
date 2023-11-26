const EPub = require("epub");
const fs = require("fs");
const nodePath = require("path");
let epub;
const handleEpub = (path) => {
    return new Promise((resolve, reject) => {
        epub = new EPub(path, '/images/', '/links/');
        const gen_html = {}
        try {
            epub.on("end", function() {
                gen_html.meta = epub.metadata;
                gen_html.flows = epub.flow;
                gen_html.chapters = []
                resolve(gen_html);
            })
            epub.on('error',(e)=>{
                reject(e)
            })
            epub.parse();
        } catch (e) {
            reject(e);
        }
    })
}

const fetchChapter = id => {
    try {
        return new Promise((resolve, reject) => {
            epub?.getChapter(id,((e,text) => {

                if(e) {
                    reject(e)
                } else {
                    const imgElements = extractImgElements(text);
                    downloadImgs(imgElements)
                    resolve(text);
                }
            }))
        })
    } catch (e) {
        reject(e)
    }

}

const downloadImgs = (imgs) => {
    if(imgs.length > 0) {
        imgs.map(img => {
            const id = img.split('/')[2]
            const path = nodePath.join(__dirname, img);
            fetchImg(id,path)
        })
    }
}
const fetchImg = (id,imgPath) => {
    epub.getImage(id, async function(error, img, mimeType){
        const folderPath = nodePath.dirname(imgPath);
        await fs.mkdir(folderPath, { recursive: true }, async (err)=>{
            await fs.writeFile(imgPath, img, (err) => {
                if (err) {
                    console.error('Error saving image:', err);
                }
            });
        });
    });
}


const extractImgElements = (text) => {
    const imgRegex = /<img\s[^>]*src\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
    const imgElements = [];
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        imgElements.push(match[1]);
    }
    return imgElements;
};





module.exports = { handleEpub, fetchChapter};