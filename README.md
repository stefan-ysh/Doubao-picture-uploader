# 🐱 豆包图片上传服务

一个专为你的宠物猫豆包设计的图片上传和管理服务，支持 iOS 快捷指令一键上传，部署在 Vercel 上的无服务器应用。

## ✨ 特性

- 📸 **一键上传**: iOS 快捷指令支持，拍照即可上传
- 🔄 **自动处理**: 自动提取 EXIF 信息、拍摄时间、设备信息
- 💾 **云端存储**: 使用 Vercel Blob Storage，1GB 免费存储空间  
- 🗂️ **智能管理**: 按时间自动分类，支持搜索和标签
- 📊 **统计分析**: 照片数量、存储使用情况一目了然
- 🌐 **RESTful API**: 完整的 API 接口，方便扩展使用
- 🚀 **零成本部署**: 基于 Vercel 免费套餐，无需服务器运维

## 🎯 使用场景

- 记录豆包的日常生活瞬间
- 通过快捷指令快速保存可爱照片
- 建立豆包的成长相册
- 分享豆包照片给朋友家人

## 🚀 快速开始

### 1. 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/stefan-ysh/Doubao-picture-uploader)

或手动部署：

1. Fork 这个仓库
2. 在 [Vercel](https://vercel.com) 创建新项目
3. 连接你的 GitHub 仓库
4. 配置环境变量（见下文）
5. 点击部署

### 2. 配置 Vercel 存储服务

部署完成后，需要在 Vercel 项目设置中启用存储服务：

1. **Vercel Blob Storage**（图片存储）
   - 进入项目 → Storage → Create Database → Blob
   - 免费套餐提供 1GB 存储空间

2. **Vercel KV**（元数据存储） 
   - 进入项目 → Storage → Create Database → KV
   - 免费套餐提供 30,000 commands/月

3. 环境变量会自动配置，无需手动设置

### 3. 配置 iOS 快捷指令

详细配置步骤请参考：[iOS 快捷指令配置指南](./docs/ios-shortcuts.md)

**快速设置：**
1. 打开 iPhone "快捷指令" 应用
2. 创建新快捷指令："上传豆包照片"
3. 添加操作：选择照片 → 获取网络内容
4. 配置上传 URL：`https://your-app-name.vercel.app/api/upload`
5. 设置表单字段：`image` = 照片文件

## 📚 API 文档

完整 API 文档请参考：[API 接口文档](./docs/api.md)

### 主要接口

```bash
# 上传图片
POST /api/upload

# 获取图片列表  
GET /api/images?limit=20&offset=0

# 获取单张图片详情
GET /api/images/{id}

# 获取统计信息
GET /api/stats
```

## 🏗️ 项目结构

```
├── api/                    # Vercel API 路由
│   ├── upload.js          # 图片上传接口
│   ├── stats.js           # 统计信息接口
│   └── images/
│       ├── index.js       # 图片列表接口
│       └── [id].js        # 单张图片详情接口
├── lib/                   # 核心逻辑库
│   ├── storage.js         # Blob Storage 操作
│   ├── database.js        # KV 数据库操作  
│   ├── metadata.js        # EXIF 数据处理
│   └── errors.js          # 错误处理工具
├── docs/                  # 文档
│   ├── api.md            # API 接口文档
│   └── ios-shortcuts.md   # iOS 快捷指令配置
├── package.json
├── vercel.json           # Vercel 配置
└── README.md
```

## 🔧 开发

### 本地运行

```bash
# 克隆项目
git clone https://github.com/stefan-ysh/Doubao-picture-uploader.git
cd Doubao-picture-uploader

# 安装依赖
npm install

# 本地开发服务器
npx vercel dev
```

### 环境变量

在 Vercel 中配置存储服务后，以下环境变量会自动设置：

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# Vercel KV  
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

## 💡 技术栈

- **后端**: Node.js + Vercel Serverless Functions
- **图片存储**: Vercel Blob Storage (1GB 免费)
- **数据库**: Vercel KV (Redis) 
- **文件处理**: Formidable + EXIF Parser
- **部署**: Vercel (免费套餐)

## 📊 免费额度说明

使用 Vercel 免费套餐可以支持：
- ✅ **存储**: 1GB 图片存储（约 1000-2000 张压缩照片）
- ✅ **数据库**: 30,000 命令/月（约 1000 次上传操作）
- ✅ **流量**: 100GB/月带宽
- ✅ **函数**: 100GB-Hours/月执行时间

对于个人使用完全够用！

## 🔒 隐私和安全

- 图片存储在你的私人 Vercel 账户中
- 支持配置访问权限（public/private）
- 地理位置信息是可选的
- 不会收集或分享个人数据
- 建议生产环境添加身份验证

## 🎨 自定义配置

### 修改上传限制

在 `lib/storage.js` 中调整：

```javascript
const maxSize = 8 * 1024 * 1024; // 修改为 8MB
const allowedTypes = ['image/jpeg', 'image/png']; // 限制格式
```

### 添加水印或压缩

可以集成图片处理库：
- Sharp (图片压缩)
- Canvas (添加水印)
- ImageMagick (高级处理)

### 自定义存储路径

在 `uploadImage` 函数中修改文件路径规则：

```javascript
const filepath = `doubao/${year}/${month}/${fileName}`;
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)  
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📝 License

本项目采用 MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🐱 关于豆包

豆包是一只可爱的宠物猫，这个项目专为记录它的美好时光而创建。希望你也能用它记录自己宠物的珍贵瞬间！

---

**Made with ❤️ for 豆包 🐱**

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！