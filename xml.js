const AdmZip = require("adm-zip");
const xml2js = require('xml2js');


module.exports = function (fileInput) {
    this.zip =  new AdmZip(fileInput);
    this.parser = new xml2js.Parser();

    this.zipEntries = this.zip.getEntries(); // an array of ZipEntry records
    this.zip.names = []; // entryName
    this.zip.containerData = null;
    this.zip.fileFullPath = null;
    this.zip.metaData = null;
    this.zip.spine=null;
    this.zip.guide = null;
    this.zip.toc = null;

    this.zip.afterMeta = {};
    this.zip.afterManifest = [];
    this.zip.afterSpine = [];
    this.zip.afterGuide = null;

//  all useful functions
    this.zip.handleReadFile = (file,cb, lowerCase) =>{
        if(file) {
            this.zip.readFileAsync(file,(data)=>{
                let xmlString;
                if(lowerCase) {
                    xmlString = data.toString("utf-8").toLowerCase().trim();
                } else {
                    xmlString = data.toString("utf-8").trim();
                }
                this.parser.parseStringPromise(xmlString).then(function (result) {
                    cb(result);
                }).catch(function (err) {
                    throw Error(`read file wrong: ${err}`);
                });
            })
        } else {
            throw Error(`no file found: ${file}`);
        }
    }

    this.zip.handleMeta = () => {
        this.zip.handleRootItems('metaData',(arr)=>{
            const keys = Object.keys(arr[0]);
            keys.forEach(key => {
                const metaHolder = (arr[0]);
                switch (key) {
                    case 'dc:language' :
                        this.zip.afterMeta['language'] = metaHolder[key];
                        break;
                    case 'dc:title' :
                        this.zip.afterMeta['title'] = metaHolder[key];
                        break;
                    case 'dc:creator'  :
                        this.zip.afterMeta['creator'] = metaHolder[key];
                        break;
                    case 'dc:publisher' :
                        this.zip.afterMeta['publisher'] = metaHolder[key];
                        break;
                }
            })
        })
    }

    this.zip.handleManifest = () => {
        this.zip.handleRootItems('manifest',(arr)=>{
            arr[0].item.forEach(item => {
                this.zip.afterManifest.push(item['$']);
            })
        })
    }
    this.zip.handleSpine = ()=>{
        this.zip.handleRootItems('spine',(arr)=>{
            arr[0].itemref.forEach(spine => {
                this.zip.afterSpine.push(spine['$']);
            })
            this.zip.toc = arr[0]['$'].toc;
        })
    }
    this.zip.handleGuide = () => {
        this.zip.handleRootItems('guide',(arr)=>{
            this.zip.afterGuide = [arr[0].reference[0]['$']]
        })
    }

    this.zip.handleRootItems = (key,cb) => {
        if(this.zip[key]) {
            cb(this.zip[key]);
        } else {
            throw Error(`no zip.${key} existed`);
        }
    }

    this.zip.handleSinglePart = async (id) =>{
        const chap = this.zip.afterManifest.find(item => item.id === id);
        if(chap['media-type'] === 'application/xhtml+xml'){
            return await this.zip.handleXml(chap);
        }
        // else if( chap['media-type'] === 'image/jpeg') {
        //     return await zip.handleImg(chap);
        // }
    }
    this.zip.handleXml = (chap) =>{
        const pathArr = (this.zip.fileFullPath.split('/'));
        pathArr[pathArr.length - 1] = chap.href;
        const actualPath = pathArr.join('/');
        return new Promise( (resolve, reject) => {
            try {
                this.zip.readFileAsync( actualPath ,(data)=>{
                    let xmlString = data.toString("utf-8");
                    let restructuredStr = removeTediousTags(xmlString);
                    resolve(restructuredStr);
                })
            } catch (e) {
                reject(e)
            }
        })

    }
    this.zip.handleImg = (chap) =>{
        const pathArr = (this.zip.fileFullPath.split('/'));
        pathArr[pathArr.length - 1] = chap.href;
        const actualPath = pathArr.join('/');
        return new Promise( (resolve, reject) => {
            try {
                this.zip.readFileAsync(actualPath,(data)=>{
                    resolve(data);
                })
            } catch (e) {
                reject(e)
            }

        })

    }
    const findFullPath = ( str) => {
        const regex= /"full-path"\s*:\s*"([^"]+)"/;

        const match = str.match(regex);

        if (match && match[1]) {
            return match[1];
        } else {
            throw Error('no full-path found')
        }
    }

    const removeTediousTags = (str) =>{
        // remove linebreaks (no multi line matches in JS regex!)
        str = str.replace(/\r?\n/g, "\u0000");
        // keep only <body> contents
        str.replace(/<body[^>]*?>(.*)<\/body[^>]*?>/i, function (o, d) {
            str = d.trim();
        });
        // remove <script> blocks if any
        str = str.replace(/<script[^>]*?>(.*?)<\/script[^>]*?>/ig, function (o, s) {
            return "";
        });

        // remove <style> blocks if any
        str = str.replace(/<style[^>]*?>(.*?)<\/style[^>]*?>/ig, function (o, s) {
            return "";
        });

        // remove onEvent handlers
        str = str.replace(/(\s)(on\w+)(\s*=\s*["']?[^"'\s>]*?["'\s>])/g, function (o, a, b, c) {
            return a + "skip-" + b + c;
        });
        return str;
    }

}



// exec
//
// zip.run = () => {
//     return new Promise((resolve, reject) => {
//         try {
//             zipEntries.forEach(function (zipEntry) {
//                 zip.names.push(zipEntry.entryName);
//                 if (zipEntry.entryName === "META-INF/container.xml") {
//                     zip.containerData = zipEntry;
//                 }
//             });
//             zip.handleReadFile(zip.containerData,(result)=>{
//                 zip.fileFullPath = findFullPath(JSON.stringify(result));
//                 zip.handleReadFile(zip.fileFullPath,(result)=>{
//                     zip.metaData = result?.package?.metadata;
//                     zip.manifest = result?.package?.manifest;
//                     zip.spine = result?.package?.spine;
//                     zip.guide = result?.package?.guide;
//                     zip.handleMeta(zip.metaData);
//                     zip.handleManifest(zip.manifest);
//                     zip.handleSpine(zip.spine);
//                     zip.handleGuide(zip.guide);
//                     resolve('ok');
//                 });
//             }, false);
//         } catch (e) {
//             reject(e)
//         }
//     })
// }


