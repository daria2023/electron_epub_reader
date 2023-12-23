const AdmZip = require("adm-zip");
const xml2js = require('xml2js');
const path = require("path");
const fs = require("fs")

module.exports = class Parser {
    constructor(fileInput) {
        const exist = fs.existsSync(fileInput);
        if(!fileInput || !exist) {
            throw Error("No valid file input provided");
        }
        this._fileInput = fileInput;
        this._zip = new AdmZip(this._fileInput);
        this._zipEntries = this._zip.getEntries();
    }
    init () {
        this._zipEntries.forEach(entry => {
                if(entry.entryName === 'mimetype'){
                    this._zip.readFileAsync(entry,(data) => {
                        if(data.toString() !== 'application/epub+zip') {
                            throw Error("Not quilified epub mime type!");
                        }
                    })
                }
        })
    }
    _findFullPath ( str) {
        const regex= /full-path\s*=\s*"([^"]+)"/;
        const match = str.match(regex);
        if (match && match[1]) {
            return match[1];
        } else {
            throw Error('no full-path found')
        }
    }
    _restructureString (str) {
            str = str.replace(/\r?\n/g, "\u0000");
            str.replace(/<body[^>]*?>(.*)<\/body[^>]*?>/i, function (o, d) {
                str = d.trim();
            });
            str = str.replace(/<script[^>]*?>(.*?)<\/script[^>]*?>/ig, function (o, s) {
                return "";
            });
            str = str.replace(/<style[^>]*?>(.*?)<\/style[^>]*?>/ig, function (o, s) {
                return "";
            });
            str = str.replace(/(\s)(on\w+)(\s*=\s*["']?[^"'\s>]*?["'\s>])/g, function (o, a, b, c) {
                return a + "skip-" + b + c;
            });
            return str;
    }
    _readFilePlus (entry, cb, xml,handleErr) {
        if(entry) {
            this._zip.readFileAsync(entry, data => {
                if(data === null) {
                    throw Error(`The file ${entry.entryName} read no data!`)
                } else if(xml) {
                    let xmlString = data.toString("utf-8").trim();
                    const parser = new xml2js.Parser();
                    parser.parseStringPromise(xmlString).then(function (result) {
                        cb(result);
                    }).catch(err => {
                        // cb(result, err);
                        handleErr(err)
                    })
                } else {
                    cb(data)
                }
            })
        } else {
            handleErr('No entry!')
        }

    };

     get _contentPath () {
         return new Promise((resolve, reject) => {
             const entry = this._zip.getEntry('META-INF/container.xml');
             this._readFilePlus(entry,   (data)=>{
                 const str = data.toString();
                 const fullPath = this._findFullPath(str);
                 resolve(fullPath.split('/'))
             })
         })
    }

    _findEntryAndRead(name,cb, xml,errHandle) {
        try {
            this._contentPath.then(path => {
                path[path.length - 1] = name;
                const menuPath = path.join('/');
                const menuEntry = this._zip.getEntry(menuPath);
                this._readFilePlus(menuEntry, cb,xml,errHandle)
            })
        } catch (e) {
            // console.log(222, e)
        }

    }

    getMenu() {
         return new Promise( (resolve, reject) => {
             try {
                 const menu = [];
                 this._findEntryAndRead('toc.ncx', (data) => {
                     if(data) {
                         data['ncx']['navMap'][0]['navPoint']?.map(nav => {
                             menu.push({
                                 src: nav['content'][0]['$']['src'],
                                 text: nav['navLabel'][0]['text'][0],
                             })
                         })
                         resolve(menu)
                     } else {
                         resolve([])
                     }
                 },true,(err)=>{
                     console.log('Parsed Menu Err: ', err)
                     resolve([])
                 })
             } catch (e) {
                reject(e)
             }
         })
    }

    getBookInfo() {
         return new Promise( (resolve, reject) => {
             try {
                 const bookInfo = {}
                 this._findEntryAndRead('content.opf', (data)=>{

                     const info = (data['package']['metadata'][0]);
                     bookInfo['title'] = info['dc:title'] ? info['dc:title'][0]['_'] || info['dc:title'][0] : '';
                     bookInfo['creator'] = info['dc:creator'][0]['_'] || info['dc:creator'][0] || ''
                     bookInfo['publisher'] = info['dc:publisher'] ? info['dc:publisher'][0]['_']|| info['dc:publisher'][0] : ''
                     bookInfo['language'] =info['dc:language'][0]['_']|| info['dc:language'][0] || ''
                     resolve(bookInfo);
                 },true,(err)=>{
                     console.log('Get info wrong', err)
                 })
             } catch (e) {
                 reject(e)
             }
         })
    }

    getManifest () {
        // manifest;
        return new Promise( (resolve, reject) => {
            try {
                const bookInfo = {}
                this._findEntryAndRead('content.opf', (data)=>{
                    const items = (data['package']['manifest'][0]['item']);
                    const contents = items.map(item => item['$']);
                    const chapters = contents.filter(item => item['media-type'] === 'application/xhtml+xml');
                    const images = contents.filter(item => item['media-type'] === 'image/jpeg' || item['media-type'] === 'image/png');
                    const styles = contents.filter(item => item['media-type'] === 'text/css');
                    // const sorts = new Set(contents.map(cnt=>cnt['media-type']));
                    bookInfo['chapters'] = chapters;
                    bookInfo['images'] = images;
                    bookInfo['styles'] = styles;
                    resolve(bookInfo);
                },true,(err)=>{
                    console.log('解析出错', err)
                })
            } catch (e) {
                reject(e)
            }
        })
    }

        getSpine () {
            // manifest;
            return new Promise( (resolve, reject) => {
                try {
                    const bookInfo = {}
                    this._findEntryAndRead('content.opf', (data)=>{
                        const spine = (data['package']['spine'][0]['itemref']);
                        const ids = spine.map( s => s['$'])
                        const manifestItems = (data['package']['manifest'][0]['item']);
                        const mans = manifestItems.map(m => m['$'])
                        const spine_menu = ids.map( id => {
                            return mans.find(m => m.id === id.idref);
                        })

                        resolve(spine_menu);
                    },true, err=>{
                        console.log('解析出错', err)
                    })
                } catch (e) {
                    reject(e)
                }
            })
        }

    getChapter(href) {
         return new Promise((resolve, reject)=>{
             try {
                 this._findEntryAndRead(href,   (data) => {
                     const str  = data.toString('utf-8');
                     const formatted = this._restructureString(str);
                     resolve(formatted)
                 }, false, err=>{
                     console.log("解析出错", err)
                 })
             } catch (e) {
                 reject(e);
             }
         })
    }

    getImgs (folder) {
        return new Promise((resolve, reject)=>{
            try {
                this.getManifest().then(cnt => {
                    const imgs = cnt['images'];
                    if(imgs.length > 0) {
                        Promise.all(imgs.map(img => {
                            this._findEntryAndRead(img.href,(data)=>{
                                const imgPaths = img.href.split('/');
                                const len = imgPaths.length;
                                const imgIdPath = imgPaths[len-1];
                                return fs.writeFileSync(path.join(folder, imgIdPath), data);
                            },false, err =>{
                                console.log('解析出错', err)
                            })
                        })).then(r => {
                            resolve({
                                code: 200,
                                msg: 'ok'
                            })
                        })
                    } else {
                        resolve({
                            code: 204,
                            data: []
                        })
                    }
                })
            } catch (e) {
                resolve({
                    code: 400,
                    msg:'Get imgs failed'
                })
            }
        })
    }

    getImgEntites () {
        return new Promise((resolve, reject)=>{
            try {
                this.getManifest().then(cnt => {
                    const imgs = cnt['images'];
                    resolve({
                        code: 200,
                        data: imgs
                    });
                })
            } catch (e) {
                resolve({
                    code: 400,
                    data: []
                });
            }
        })
    }



}
//
// const ppp = new Parser('./books/aa.epub');
// //
// ppp.init()
// ppp.getImgEntites().then(m => {
//     console.log(m);
// })

// ppp.getMenu().then(res=>{
//     ppp.getSpine().then((spine)=>{
//         console.log(spine, res)
//
//     })
// })

// parser.getBookInfo().then(res => {
//     console.log(res)
// })

// parser.getImgs().then(res=>{
//     // console.log(res.length)
// })


