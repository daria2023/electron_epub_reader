const file_list  = document.getElementById('file-list');
const note_list = document.getElementById('notes-list');

const fetchData = (cfg, empty, container,cb) => {
    fetch(cfg.url,{
        method: cfg.method
    }).then(res => {
        return (res.json());
    }).then(res => {
        if(res.code === 200 && res.data.length > 0) {
            cb(res.data)
        } else {
            const pEl = document.createElement('p');
            pEl.innerHTML = empty;
            container.appendChild(pEl);
        }
    })
}

fetchData({url:'/books', method:'GET'}, 'No books yet, add some!', file_list, (data)=>{
    data.map(li => {
        const l = document.createElement('li');
        const a = document.createElement('a');
        a.innerHTML = li;
        l.append(a);
        file_list.appendChild(l);
        l.addEventListener('click', async () => {
            const fileName = li.split('.epub');

            const encodedFilename = encodeURIComponent(li);
            const res = await fetch('/read/'+ encodedFilename);
                if(res.code === 200) {
                    window.location.replace('http://localhost:9877/info/'+encodedFilename);
                }
        })
    })
});

fetchData({url:'/notes', method:'GET'}, 'No books yet, add some!', note_list, (data)=>{
    data.map(li => {
        const l = document.createElement('li');
        const a = document.createElement('a');
        a.innerHTML = li;
        l.append(a);
        note_list.appendChild(l);
        l.addEventListener('click', async () => {
            // const encodedFilename = encodeURIComponent(li);
            // const res = await fetch('/books/'+ encodedFilename);
            // const data = await res.text();
            //     if(data === 'done') {
            //         window.location.replace('http://localhost:9999/cover');
            //     }
            // })
        })
    })
})

const reduceFileType = str =>{
    return str.replace(/[\s:]+/g, '');
}