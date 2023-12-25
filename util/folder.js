const fs = require("fs");

const readFolder = (folder) => {
    return new Promise((resolve, reject) => {
        try{
            fs.readdir(folder, { }, (err, files) => {
                if(err) {
                    resolve({
                        code: 400,
                        msg: err,
                    })
                } else {
                    resolve({
                        code: 200,
                        files
                    })
                }
            })
        } catch (e) {
            console.log('read folder err', e);
            resolve({
                code: 400,
                msg: e,
            })
        }
        // fs.readdir(folder, { }, (err, files) => {
        //     if(err) {
        //         reject({
        //             code: 400,
        //             msg: err,
        //         })
        //     } else {
        //         resolve(files)
        //     }
        // })
    })

}
const isFolderExist = (path) => {
    return new Promise( (resolve, reject) => {
        fs.exists(path,(exists)=>{
            if(exists) {
                resolve(200)
            }
            fs.mkdir(path,{recursive: true}, (err) => {
                if(err) {
                    reject({
                        code: 400,
                        msg: err,
                    })
                } else {
                    resolve(200)
                }
            })
        })
    })
}
const replace_spaces = str => {
    return str.replace(/[\s:]+/g, '_');
}

const reduceFileType = str =>{
    return str.replace(/.epub$/, '');
}
module.exports = { isFolderExist, readFolder, replace_spaces, reduceFileType }