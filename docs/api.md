# API 接口文档

## 豆包图片上传服务 API

### 基础信息

- **基础 URL**: `https://your-app-name.vercel.app`
- **认证方式**: 无（可根据需要添加）
- **请求格式**: `multipart/form-data` (上传), `application/json` (查询)
- **响应格式**: `application/json`

### 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": { /* 具体数据 */ },
  "message": "操作成功消息",
  "timestamp": "2025-09-25T10:30:00.000Z"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-25T10:30:00.000Z"
}
```

### 错误代码说明

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| `METHOD_NOT_ALLOWED` | 405 | 请求方法不支持 |
| `NO_FILE_UPLOADED` | 400 | 未上传文件 |
| `INVALID_IMAGE` | 400 | 图片格式或大小不符合要求 |
| `CORRUPTED_IMAGE` | 400 | 图片文件损坏 |
| `FILE_TOO_LARGE` | 413 | 文件大小超过限制 |
| `IMAGE_NOT_FOUND` | 404 | 图片不存在 |
| `STORAGE_ERROR` | 503 | 存储服务错误 |
| `DATABASE_ERROR` | 503 | 数据库错误 |

---

## 1. 上传图片

### `POST /api/upload`

上传豆包照片到服务器。

#### 请求参数

**Content-Type**: `multipart/form-data`

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `image` 或 `file` | File | ✓ | 图片文件 |

#### 文件限制

- **支持格式**: JPEG, PNG, WebP, HEIC, HEIF
- **文件大小**: 最大 4MB
- **数量限制**: 单次上传 1 张

#### 响应示例

**成功响应** (201)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://blob.vercel-storage.com/images/2025/09/25/doubao-550e8400.jpg",
    "fileName": "doubao-550e8400.jpg",
    "originalName": "IMG_1234.HEIC",
    "size": 1024000,
    "mimeType": "image/jpeg",
    "uploadTime": "2025-09-25T10:30:00.000Z",
    "shotTime": "2025-09-25T10:25:00.000Z",
    "device": "iPhone 15 Pro",
    "dimensions": {
      "width": 3024,
      "height": 4032,
      "orientation": 1
    }
  },
  "message": "图片上传成功！豆包又有新照片啦 🐱"
}
```

#### cURL 示例

```bash
curl -X POST \
  https://your-app-name.vercel.app/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/doubao-photo.jpg"
```

---

## 2. 获取图片列表

### `GET /api/images`

获取豆包照片列表，支持分页和搜索。

#### 查询参数

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `limit` | number | ✗ | 20 | 返回数量限制 (1-100) |
| `offset` | number | ✗ | 0 | 偏移量 |
| `order` | string | ✗ | desc | 排序方式: `desc`(新到旧) 或 `asc`(旧到新) |
| `search` | string | ✗ | - | 搜索关键词 |

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "fileName": "doubao-550e8400.jpg",
      "originalName": "IMG_1234.HEIC",
      "url": "https://blob.vercel-storage.com/images/2025/09/25/doubao-550e8400.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "uploadTime": "2025-09-25T10:30:00.000Z",
      "shotTime": "2025-09-25T10:25:00.000Z",
      "device": "iPhone 15 Pro",
      "dimensions": { "width": 3024, "height": 4032, "orientation": 1 },
      "tags": ["doubao", "cat"]
    }
  ],
  "pagination": {
    "total": 42,
    "count": 20,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "nextOffset": 20
  },
  "message": "获取到 20 张豆包照片"
}
```

#### cURL 示例

```bash
# 获取最新 10 张照片
curl "https://your-app-name.vercel.app/api/images?limit=10"

# 搜索包含"可爱"的照片
curl "https://your-app-name.vercel.app/api/images?search=可爱"
```

---

## 3. 获取单张图片详情

### `GET /api/images/{id}`

根据 ID 获取单张豆包照片的详细信息。

#### 路径参数

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `id` | string | ✓ | 图片唯一 ID |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "doubao-550e8400.jpg",
    "originalName": "IMG_1234.HEIC",
    "url": "https://blob.vercel-storage.com/images/2025/09/25/doubao-550e8400.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg",
    "uploadTime": "2025-09-25T10:30:00.000Z",
    "shotTime": "2025-09-25T10:25:00.000Z",
    "device": "iPhone 15 Pro",
    "dimensions": {
      "width": 3024,
      "height": 4032,
      "orientation": 1
    },
    "photoSettings": {
      "iso": 100,
      "aperture": 1.8,
      "shutterSpeed": 0.008,
      "focalLength": 26
    },
    "tags": ["doubao", "cat"],
    "exif": {
      "camera": {
        "make": "Apple",
        "model": "iPhone 15 Pro",
        "software": "iOS 17.0"
      },
      "settings": {
        "iso": 100,
        "fNumber": 1.8,
        "exposureTime": 0.008333,
        "focalLength": 26,
        "flash": 0
      },
      "image": {
        "width": 3024,
        "height": 4032,
        "orientation": 1,
        "colorSpace": 1
      },
      "hasGPS": true
    },
    "uploadSource": "api",
    "uploadPath": "images/2025/09/25/doubao-550e8400.jpg"
  },
  "message": "豆包照片详情 - IMG_1234.HEIC"
}
```

#### cURL 示例

```bash
curl "https://your-app-name.vercel.app/api/images/550e8400-e29b-41d4-a716-446655440000"
```

---

## 4. 获取统计信息

### `GET /api/stats`

获取豆包照片收藏的统计信息。

#### 响应示例

```json
{
  "success": true,
  "data": {
    "totalImages": 42,
    "totalSize": 104857600,
    "totalSizeMB": 100.0,
    "averageSizeKB": 2441.1,
    "lastUpdated": "2025-09-25T10:30:00.000Z",
    "serviceStatus": "running",
    "funFacts": {
      "description": "豆包照片收藏统计",
      "emoji": "📸🐱",
      "message": "已经收集了 42 张豆包的珍贵时刻！"
    }
  },
  "message": "统计信息获取成功"
}
```

#### cURL 示例

```bash
curl "https://your-app-name.vercel.app/api/stats"
```

---

## 使用示例

### JavaScript (Fetch API)

```javascript
// 上传图片
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch('https://your-app.vercel.app/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('上传成功:', result.data);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}

// 获取图片列表
async function getImages(limit = 20, offset = 0) {
  try {
    const response = await fetch(
      `https://your-app.vercel.app/api/images?limit=${limit}&offset=${offset}`
    );
    
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('获取列表失败:', error);
    return [];
  }
}
```

### Python

```python
import requests

# 上传图片
def upload_image(file_path):
    url = 'https://your-app.vercel.app/api/upload'
    
    with open(file_path, 'rb') as f:
        files = {'image': f}
        response = requests.post(url, files=files)
    
    if response.status_code == 201:
        return response.json()['data']
    else:
        raise Exception(response.json()['error'])

# 获取图片列表  
def get_images(limit=20, offset=0):
    url = f'https://your-app.vercel.app/api/images?limit={limit}&offset={offset}'
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()['data']
    else:
        return []
```

---

## 注意事项

1. **文件大小限制**: 单个文件最大 4MB
2. **并发限制**: Vercel 免费版有并发限制
3. **存储限制**: Vercel Blob 免费版提供 1GB 存储
4. **CORS**: 已配置允许跨域请求
5. **错误处理**: 请根据错误代码进行相应处理
6. **重试机制**: 建议实现指数退避重试

## 版本信息

- **API 版本**: 1.0.0
- **最后更新**: 2025-09-25
- **兼容性**: 支持所有现代浏览器和 HTTP 客户端