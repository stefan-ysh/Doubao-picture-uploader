# 部署指南

## 部署到 Vercel

### 方式一：一键部署（推荐）

点击下面的按钮直接部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/stefan-ysh/Doubao-picture-uploader)

### 方式二：手动部署

#### 1. 准备工作

1. **GitHub 账户**: 确保有 GitHub 账户
2. **Vercel 账户**: 在 [vercel.com](https://vercel.com) 注册账户
3. **Fork 仓库**: Fork 这个项目到你的 GitHub 账户

#### 2. 创建 Vercel 项目

1. 登录 Vercel Dashboard
2. 点击 "New Project" 
3. 选择 "Import Git Repository"
4. 选择你 Fork 的 `Doubao-picture-uploader` 仓库
5. 项目配置：
   - **Project Name**: `doubao-uploader` (或你喜欢的名字)
   - **Framework Preset**: Other
   - **Root Directory**: `./` (默认)
   - **Build Command**: 留空
   - **Install Command**: `npm install`

#### 3. 首次部署

1. 点击 "Deploy" 开始部署
2. 等待部署完成（通常 1-2 分钟）
3. 获得部署 URL: `https://your-project-name.vercel.app`

#### 4. 配置存储服务

**重要**：部署完成后必须配置存储服务才能正常使用！

##### 4.1 配置 Vercel Blob Storage

1. 进入项目 Dashboard
2. 点击 "Storage" 标签
3. 点击 "Create Database"
4. 选择 "Blob"
5. 数据库名称: `doubao-images`
6. 点击 "Create"

##### 4.2 配置 Vercel KV

1. 在同一个 "Storage" 页面
2. 再次点击 "Create Database" 
3. 选择 "KV"
4. 数据库名称: `doubao-metadata`
5. 点击 "Create"

#### 5. 重新部署

配置存储后需要重新部署：
1. 进入项目 → "Deployments" 
2. 点击最新部署右侧的 "..." 
3. 选择 "Redeploy"

### 自定义域名（可选）

1. 进入项目 → "Settings" → "Domains"
2. 添加你的域名
3. 配置 DNS 记录指向 Vercel

---

## 验证部署

### 1. 测试 API 接口

使用浏览器或 curl 测试：

```bash
# 测试统计接口
curl https://your-app-name.vercel.app/api/stats

# 预期响应
{
  "success": true,
  "data": {
    "totalImages": 0,
    "totalSize": 0,
    "serviceStatus": "running",
    "funFacts": {
      "message": "还没有豆包的照片，快来上传第一张吧！"
    }
  }
}
```

### 2. 测试图片上传

```bash
# 使用 curl 上传测试图片
curl -X POST \
  https://your-app-name.vercel.app/api/upload \
  -F "image=@/path/to/test-image.jpg"
```

### 3. 查看部署日志

如果有问题，检查 Vercel 的函数日志：
1. 进入项目 Dashboard
2. 点击 "Functions" 标签  
3. 查看各个 API 函数的执行日志

---

## 环境变量管理

### 查看环境变量

1. 进入项目 → "Settings" → "Environment Variables"
2. 确认以下变量存在：
   - `BLOB_READ_WRITE_TOKEN`
   - `KV_REST_API_URL` 
   - `KV_REST_API_TOKEN`

这些变量在创建存储服务时会自动添加。

### 添加自定义环境变量（可选）

如果需要添加额外配置：

```bash
# 例如：上传通知 Webhook
UPLOAD_WEBHOOK_URL=https://your-webhook-url.com

# API 访问密钥（如果需要认证）
API_SECRET=your-secret-key
```

---

## 域名和 SSL

### 免费 .vercel.app 域名

每个项目自动获得：
- `https://project-name.vercel.app`
- 自动 HTTPS
- 全球 CDN

### 自定义域名

1. **添加域名**:
   - Settings → Domains → Add Domain
   - 输入你的域名 (如 `doubao.example.com`)

2. **配置 DNS**:
   ```
   Type: CNAME
   Name: doubao (或 @)
   Value: cname.vercel-dns.com
   ```

3. **SSL 证书**:
   - Vercel 自动提供 Let's Encrypt SSL
   - 通常几分钟内生效

---

## 性能优化

### 1. 函数配置

在 `vercel.json` 中可以调整：

```json
{
  "functions": {
    "api/upload.js": {
      "maxDuration": 10,
      "memory": 1024
    }
  }
}
```

### 2. 缓存配置

```json
{
  "headers": [
    {
      "source": "/api/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300"
        }
      ]
    }
  ]
}
```

### 3. 地区配置

```json
{
  "regions": ["hkg1", "sin1", "nrt1"]
}
```

---

## 监控和维护

### 1. 使用情况监控

- **Dashboard**: 查看部署、函数调用、带宽使用
- **Analytics**: 启用 Vercel Analytics 查看访问统计
- **Speed Insights**: 监控性能指标

### 2. 错误监控

```javascript
// 在 API 中添加错误监控
export default async function handler(req, res) {
  try {
    // ... your code
  } catch (error) {
    console.error('API Error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
    // ... error response
  }
}
```

### 3. 日志查看

- **Realtime Logs**: 实时查看函数执行日志
- **Edge Logs**: 查看 CDN 边缘日志
- **Build Logs**: 查看部署构建日志

---

## 故障排除

### 常见问题

#### 1. 存储服务未配置

**错误**: `Missing environment variables`
**解决**: 确保已创建 Blob Storage 和 KV 数据库

#### 2. 函数超时

**错误**: `Function execution timeout`
**解决**: 
- 检查图片大小是否超过 4MB
- 优化代码执行效率
- 增加函数超时时间

#### 3. CORS 错误

**错误**: `CORS policy blocked`
**解决**: 检查 `vercel.json` 中的 CORS 配置

#### 4. 上传失败

**错误**: `Upload failed`
**排查步骤**:
1. 检查存储配置
2. 查看函数日志
3. 验证图片格式和大小
4. 测试网络连接

### 调试技巧

1. **本地调试**:
   ```bash
   vercel env pull .env.local
   vercel dev
   ```

2. **日志调试**:
   ```javascript
   console.log('Debug info:', { req: req.method, body: req.body });
   ```

3. **Edge 函数测试**:
   ```bash
   vercel --debug
   ```

---

## 升级和迁移

### 代码更新

1. **自动部署**: Push 到 main 分支自动触发部署
2. **手动部署**: 在 Dashboard 点击 "Redeploy"
3. **回滚**: 选择历史版本进行回滚

### 数据备份

```javascript
// 定期备份 KV 数据
import { kv } from '@vercel/kv';

async function backupData() {
  const imageIds = await kv.zrange('images:timeline', 0, -1);
  const images = await Promise.all(
    imageIds.map(id => kv.get(`image:${id}`))
  );
  
  // 保存到文件或其他存储
  console.log(JSON.stringify(images, null, 2));
}
```

### 存储迁移

如果需要迁移到其他存储服务：
1. 导出现有数据
2. 修改 `lib/storage.js` 中的存储逻辑
3. 更新环境变量
4. 测试后重新部署

---

## 成本预估

### Vercel 免费套餐限制

- **函数执行**: 100GB-Hours/月
- **带宽**: 100GB/月
- **Blob Storage**: 1GB
- **KV 操作**: 30,000 次/月
- **边缘函数**: 500KB 代码大小

### 超出免费套餐

如果使用量超出，可以升级到 Pro 套餐：
- $20/月
- 更高的限制和更好的性能
- 优先支持

### 节省成本的建议

1. **图片压缩**: 上传前压缩图片
2. **缓存策略**: 合理使用 CDN 缓存
3. **批量操作**: 减少 KV 操作次数
4. **监控使用**: 定期检查用量仪表板

---

**部署完成后，别忘了配置 iOS 快捷指令来测试完整的上传流程！** 🚀