import formidable from 'formidable';
import fs from 'fs';
import { uploadImage, validateImage } from '../lib/storage.js';
import { saveImageMetadata } from '../lib/database.js';
import { extractExifData, generateImageSummary, validateImageIntegrity } from '../lib/metadata.js';
import { setCorsHeaders, validateMethod, sendError, createSuccessResponse, ErrorCodes, safeLog } from '../lib/errors.js';
import mime from 'mime-types';

// 配置 Vercel 无服务器函数
export const config = {
  api: {
    bodyParser: false, // 禁用默认解析器，使用 formidable
  },
};

/**
 * 图片上传 API
 * POST /api/upload
 */
export default async function handler(req, res) {
  // 设置 CORS 头
  setCorsHeaders(res, { methods: 'POST, OPTIONS' });
  
  // 验证请求方法
  if (!validateMethod(req, res, 'POST')) {
    return;
  }
  
  try {
    console.log('开始处理图片上传请求...');
    
    // 解析上传的文件
    const form = formidable({
      maxFileSize: 4 * 1024 * 1024, // 4MB 限制
      maxFiles: 1, // 一次只能上传一个文件
      allowEmptyFiles: false,
    });
    
    const [fields, files] = await form.parse(req);
    
    // 检查是否有上传的文件
    const uploadedFile = files.image?.[0] || files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: '没有找到上传的图片文件，请使用 "image" 或 "file" 字段名',
        code: 'NO_FILE_UPLOADED'
      });
    }
    
    console.log('文件信息:', {
      name: uploadedFile.originalFilename,
      size: uploadedFile.size,
      type: uploadedFile.mimetype
    });
    
    // 读取文件内容
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const mimeType = uploadedFile.mimetype || mime.lookup(uploadedFile.originalFilename) || 'application/octet-stream';
    
    // 验证图片格式和大小
    const validation = validateImage(fileBuffer, mimeType);
    if (!validation.isValid) {
      // 清理临时文件
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({
        success: false,
        error: validation.error,
        code: 'INVALID_IMAGE'
      });
    }
    
    // 验证图片完整性
    const integrityCheck = validateImageIntegrity(fileBuffer, mimeType);
    if (!integrityCheck.isValid) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({
        success: false,
        error: integrityCheck.error,
        code: 'CORRUPTED_IMAGE'
      });
    }
    
    // 提取 EXIF 元数据
    console.log('提取 EXIF 数据...');
    const exifData = extractExifData(fileBuffer);
    
    // 上传到 Blob Storage
    console.log('上传到 Blob Storage...');
    const uploadResult = await uploadImage(
      fileBuffer, 
      uploadedFile.originalFilename || 'image.jpg', 
      mimeType
    );
    
    // 生成图片摘要
    const imageSummary = generateImageSummary(exifData, {
      originalName: uploadedFile.originalFilename,
      size: fileBuffer.length,
      mimeType: mimeType
    });
    
    // 准备元数据
    const metadata = {
      ...uploadResult,
      shotTime: imageSummary.shotTime,
      exifData: exifData,
      summary: imageSummary,
      extra: {
        userAgent: req.headers['user-agent'],
        uploadSource: 'api',
        clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
      }
    };
    
    // 保存元数据到数据库
    console.log('保存元数据到数据库...');
    await saveImageMetadata(uploadResult.id, metadata);
    
    // 清理临时文件
    fs.unlinkSync(uploadedFile.filepath);
    
    // 返回成功响应
    const response = {
      success: true,
      data: {
        id: uploadResult.id,
        url: uploadResult.url,
        fileName: uploadResult.fileName,
        originalName: uploadResult.originalName,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        uploadTime: metadata.summary.uploadTime,
        shotTime: metadata.summary.shotTime,
        device: metadata.summary.device,
        dimensions: metadata.summary.dimensions
      },
      message: '图片上传成功！豆包又有新照片啦 🐱'
    };
    
    console.log('上传成功:', uploadResult.id);
    return res.status(201).json(response);
    
  } catch (error) {
    console.error('上传失败:', error);
    
    // 错误分类处理
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = error.message;
    
    if (error.message.includes('图片上传失败')) {
      statusCode = 503;
      errorCode = 'STORAGE_ERROR';
    } else if (error.message.includes('保存图片元数据失败')) {
      statusCode = 503;
      errorCode = 'DATABASE_ERROR';
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      errorCode = 'FILE_TOO_LARGE';
      errorMessage = '文件太大，请选择小于 4MB 的图片';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      errorCode = 'INVALID_FIELD';
      errorMessage = '请使用正确的文件字段名上传图片';
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
}