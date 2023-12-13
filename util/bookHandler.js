
const handleBook = (book) => {
    book.init();
    return new Promise((resolve, reject) => {
        try {
            book.getBookInfo().then(info => {
                resolve({
                    code: 200,
                    data: info
                })
            })
        } catch (e) {
            reject(e)
        }

    })

}


module.exports = {handleBook}