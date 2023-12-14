const fs = require("fs");
const {isFolderExist, isFileExist} = require("./folder");

const ejsWriter = async (ejs, passedData, modelPath, generatedPath ) => {
    return new Promise(async (resolve, reject) =>{
        try {
            const model_path = modelPath;
            const gen_path = generatedPath;
            isFileExist(generatedPath).then((data)=>{
                if(data === 200){
                    fs.readFile(model_path,'utf-8',(err,fileString) => {
                        if(!err) {
                            const html = ejs.render(fileString, passedData);
                            fs.writeFile(gen_path, html, 'utf8',()=>{
                                resolve('ok')
                            });
                        } else {
                            reject(err)
                        }
                    });
                }
            })
        } catch (e) {
            reject(e)
        }
    })

}


module.exports = {ejsWriter}