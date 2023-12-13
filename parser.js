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
            // console.log(entry.entryName);
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
    _readFilePlus (entry, cb, xml) {
        this._zip.readFileAsync(entry, data => {
            if(data === null) {
                throw Error(`The file ${entry.entryName} read no data!`)
            } else if(xml) {

                let xmlString = data.toString("utf-8").trim();
                const parser = new xml2js.Parser();
                try {
                    parser.parseStringPromise(xmlString).then(function (result) {
                        cb(result);
                    })
                } catch (e) {
                    throw Error(e);
                }
            } else {
                cb(data)
            }
        })
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

    _findEntryAndRead(name,cb, xml) {
        this._contentPath.then(path => {
            path[path.length - 1] = name;
            const menuPath = path.join('/');
            const menuEntry = this._zip.getEntry(menuPath);
            this._readFilePlus(menuEntry, cb,xml)
        })
    }

    getMenu() {
         return new Promise( (resolve, reject) => {
             try {
                 const menu = [];
                 this._findEntryAndRead('toc.ncx', data => {
                     if(data) {
                         data['ncx']['navMap'][0]['navPoint']?.map(nav => {
                             menu.push({
                                 src: nav['content'][0]['$']['src'],
                                 text: nav['navLabel'][0]['text'][0],
                             })
                         })
                         resolve(menu)
                     }
                 },true)
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
                     bookInfo['title'] = info['dc:title'][0]['_'] || info['dc:title'][0] || '';
                     bookInfo['creator'] = info['dc:creator'][0]['_'] || info['dc:creator'][0] || ''
                     bookInfo['publisher'] = info['dc:publisher'][0]['_']|| info['dc:publisher'][0] || ''
                     bookInfo['language'] =info['dc:language'][0]['_']|| info['dc:language'][0] || ''
                     resolve(bookInfo);
                 },true)
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
                },true)
            } catch (e) {
                reject(e)
            }
        })
    }

    getChapters () {
         return new Promise((resolve, reject)=>{
             try {
                 this.getManifest().then(cnt => {
                     const chaps = cnt['chapters'];
                     const len = chaps.length;
                     const holder = [];
                      chaps.map( (ch,idx) => {
                          this._findEntryAndRead(ch.href,   (data) => {
                             const str  = data.toString('utf-8');
                             const formatted = this._restructureString(str);
                             holder.push(formatted);
                             idx === len - 1 ? resolve(holder) : null;
                         }, false)

                     })
                 })
             } catch (e) {
                 reject(e);
             }
         })
    }

    getImgs () {
        return new Promise((resolve, reject)=>{
            try {
                this.getManifest().then(cnt => {
                    const imgs = cnt['images'];
                    console.log(imgs)
                })
            } catch (e) {
                reject(e);
            }
        })
    }



}



// parser.getMenu().then(res=>{
//     console.log(res)
// })

// parser.getBookInfo().then(res => {
//     console.log(res)
// })

// parser.getImgs().then(res=>{
//     // console.log(res.length)
// })
