const file_list  = document.getElementById('file-list');
const note_list = document.getElementById('notes-list');
const fileInput = document.getElementById('uploading');


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
            const encodedFilename = encodeURIComponent(li);
            const res = await fetch('/read/'+ encodedFilename);
            const data = await res.json()
                if(data.code === 200) {
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
            const encodedFilename = encodeURIComponent(li);
            console.log('1121')

            const res = await fetch('/read/'+ encodedFilename);
            console.log('1121')
            const data = await res.json();
            console.log(data, await res)
                if(data.code === 200) {
                    console.log('okk')
                    window.location.replace(`http://localhost:9877/info/${li}`);
                }
            })
    })
})


fileInput.addEventListener('change', async e =>{
    const file = e.target.files[0];
    await handleFile(file)
})

const handleFile = async file => {
    const formData = new FormData();
    formData.append('file', file)
    const res = await fetch('/',{
        method:'post',
        body: formData
    });
    const status = await res.status
    if(status === 200){
        window.location.reload();
    }

}