const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    cb(null, `doubao-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Parse JSON bodies
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择一张图片' });
    }

    const photoInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadTime: new Date().toISOString(),
      description: req.body.description || ''
    };

    res.json({
      success: true,
      message: '豆包的照片上传成功！',
      photo: photoInfo
    });
  } catch (error) {
    res.status(500).json({ error: '上传失败：' + error.message });
  }
});

// Get all uploaded photos
app.get('/api/photos', async (req, res) => {
  try {
    const files = await fs.readdir(uploadsDir);
    const photos = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          uploadTime: stats.birthtime.toISOString(),
          size: stats.size,
          url: `/uploads/${file}`
        };
      })
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: '获取照片列表失败' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件太大，请选择小于10MB的图片' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`豆包照片上传服务运行在 http://localhost:${PORT}`);
});