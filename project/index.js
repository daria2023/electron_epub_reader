
const uploadEl = document.getElementById('upload-btn');


const fileInput = document.getElementById('uploading');

fileInput?.addEventListener('change', async e =>{
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
        window.location.replace('http://localhost:9999/cover')
    }

}

const allImages = document.querySelectorAll('img')
