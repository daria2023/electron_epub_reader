const AdmZip = require("adm-zip");
const xml2js = require('xml2js');
const path = require("path");
const fs = require("fs")

function parser(fileInput) {
    if(!fileInput) {
        throw Error("no file input provided");
    }
    const exist = fs.existsSync(fileInput);
    if(!exist){
        throw Error("Can not find the file you provided!");
    } else {
        this.zip = new AdmZip(fileInput);
        this.zipEntries = this.zip.getEntries();
        this.init = () => {
            this.zipEntries.forEach(entry => {
                if(entry.entryName === 'mimetype'){
                    this.zip.readFileAsync(entry,(data) => {
                        if(data.toString() !== 'application/epub+zip') {
                            return Error("Not quilified epub mime type!");
                        }
                    })
                }
                if(entry.entryName === 'META-INF/container.xml') {
                    this.zip.readFileAsync(entry,(data) => {
                        const str = data.toString();
                        const full = findFullPath(str);
                    })
                }
                })
            };
        };
        this.init();

        this.zip.readFilePlus = (entry, cb) => {
            this.zip.readFileAsync(entry, data => {
                if(data === null) {
                    throw Error(`The file ${entry.entryName} read no data!`)
                } else {
                    cb(data);
                }
            })
        };

}

const findFullPath = ( str) => {
        const regex= /full-path\s*=\s*"([^"]+)"/;
        const match = str.match(regex);
        if (match && match[1]) {
            return match[1];
        } else {
            throw Error('no full-path found')
        }
    }

parser('./books/aa.epub');