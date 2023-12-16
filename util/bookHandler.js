const path = require("path");
const fs = require("fs");

const handleBook = (book) => {
    book.init();
    return new Promise((resolve, reject) => {
        try {
            book.getBookInfo().then(info => {
                book.getMenu().then(menu => {
                    if(menu.length === 0){
                        book.getSpine().then(spine =>{
                            // console.log(spine)
                            info.menu = spine.map(s  => {
                                return {
                                    src: s.href,
                                    text: s.id
                                }
                            })
                            // console.log(info.menu)
                            resolve({
                                code: 200,
                                data: info
                            })
                        })
                    } else {
                        info.menu = menu;
                        resolve({
                            code: 200,
                            data: info
                        })
                    }


                })

            })
        } catch (e) {
            reject(e)
        }

    })

}

const handleBookContent = (book, chapter) => {
    book.init();
    return new Promise(async (resolve, reject) => {
        try {
            const received = await book.getChapter(chapter);
            resolve({
                code: 200,
                content: received
            })
        } catch (e) {
            resolve({
                code:400,
                msg:'Cant get the chapter'
            })
        }

    })

}

const ejsRender = (ejs, modelPath, generatedPath, passedData) => {
    return new Promise( (resolve, reject) => {
        try {
            fs.readFile(modelPath,'utf-8',(err, ejsModelString) => {
                const html = ejs.render(ejsModelString, passedData);
                fs.writeFile(generatedPath, html, 'utf-8',()=>{
                    resolve(200)
                })
            })
        } catch (e) {
            reject(e)
        }
    })
}

module.exports = {handleBook, ejsRender, handleBookContent}