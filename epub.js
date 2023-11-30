const EPub = require("epub");
const fs = require("fs");
const nodePath = require("path");
let epub;
const handleEpub = (path, fileName) => {
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
                throw Error(`解析epub失败，${e}`)
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
                    const imgs1 = extractImgElements1(text);
                    downloadImgs(imgs1)
                    // const imgElements = extractImgElements(text);
                    // downloadImgs(imgElements)
                    resolve(text);
                }
            }))
        })
    } catch (e) {
        throw(e)
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

const extractImgElements1 = (text) => {
    const imgRegex = /<img\s[^>]*src\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
    const imgElements = [];
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        imgElements.push(match[1]);
    }
    return imgElements;
};
const extractImgElements = (text) => {
    const imgRegex = /<img\s([^>]*)>/gi;
    // const imgRegex = /<img\s[^>]*src\s*=\s*['"]([^'"]+)['"][^>]*>/gi;


    const imgElements = [];
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        const imgTag = match[0];
        const idMatch = imgTag.match(/\sid\s*=\s*['"]([^'"]+)['"]/);
        const id = idMatch ? idMatch[1] : '';
        const srcMatch = imgTag.match(/\ssrc\s*=\s*['"]([^'"]+)['"]/);

        if (!srcMatch) {
            const newSrc = id ? `/images/${id}` : '';
            const modifiedImgTag = srcMatch
                ? imgTag.replace(/\ssrc\s*=\s*['"]([^'"]+)['"]/, ` src="${newSrc}"`)
                : imgTag.replace(/<img\s/, `<img src="${newSrc}" `);

            imgElements.push(modifiedImgTag);
        } else {
            imgElements.push(imgTag);
        }
    }

    return imgElements;
};



module.exports = { handleEpub, fetchChapter};