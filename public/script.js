// DOM elements
const uploadForm = document.getElementById('uploadForm');
const photoInput = document.getElementById('photoInput');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const uploadBtn = document.getElementById('uploadBtn');
const btnText = uploadBtn.querySelector('.btn-text');
const loading = uploadBtn.querySelector('.loading');
const gallery = document.getElementById('gallery');
const toast = document.getElementById('toast');

// Event listeners
photoInput.addEventListener('change', handleFileSelect);
uploadForm.addEventListener('submit', handleUpload);

// Load gallery on page load
document.addEventListener('DOMContentLoaded', loadGallery);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('请选择图片文件', 'error');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('文件太大，请选择小于10MB的图片', 'error');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function handleUpload(event) {
    event.preventDefault();
    
    const file = photoInput.files[0];
    if (!file) {
        showToast('请选择一张照片', 'error');
        return;
    }

    // Show loading state
    uploadBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('description', document.getElementById('description').value);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showToast(result.message, 'success');
            
            // Reset form
            uploadForm.reset();
            previewContainer.style.display = 'none';
            
            // Reload gallery
            loadGallery();
        } else {
            showToast(result.error || '上传失败', 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
        console.error('Upload error:', error);
    } finally {
        // Reset button state
        uploadBtn.disabled = false;
        btnText.style.display = 'inline-block';
        loading.style.display = 'none';
    }
}

async function loadGallery() {
    try {
        const response = await fetch('/api/photos');
        const photos = await response.json();

        if (photos.length === 0) {
            gallery.innerHTML = '<div class="loading-gallery">还没有上传任何照片，快来上传豆包的第一张照片吧！</div>';
            return;
        }

        gallery.innerHTML = photos.map(photo => {
            const uploadDate = new Date(photo.uploadTime);
            const formattedDate = uploadDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="photo-item">
                    <img src="${photo.url}" alt="豆包的照片" loading="lazy">
                    <div class="photo-info">
                        <div class="date">${formattedDate}</div>
                        <div class="description">${photo.description || '可爱的豆包'}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        gallery.innerHTML = '<div class="loading-gallery">加载照片失败，请刷新页面重试</div>';
        console.error('Gallery load error:', error);
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}