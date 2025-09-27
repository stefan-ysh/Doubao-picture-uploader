import formidable from 'formidable';
import fs from 'fs';
import mime from 'mime-types';

import { saveImageMetadata } from '../lib/database.js';
import { createSuccessResponse, ErrorCodes, safeLog, sendError, setCorsHeaders, validateMethod } from '../lib/errors.js';
import { extractExifData, generateImageSummary, validateImageIntegrity } from '../lib/metadata.js';
import { uploadImage, validateImage } from '../lib/storage.js';

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
      maxFileSize: 50 * 1024 * 1024, // 50MB 限制（适应高质量照片）
      maxTotalFileSize: 50 * 1024 * 1024, // 总文件大小限制
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
    console.log(`接收到文件: ${uploadedFile.originalFilename} (${uploadedFile.size} bytes)`);    
    // 解析快捷指令传来的额外参数
    const clientParams = Object.entries(fields).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value[0] : value;
        return acc;
    }, {});

    
    // 处理快捷指令的时间格式
    const parseShortcutDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        // 处理"2025年9月25日 22:15"格式
        const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/);
        if (match) {
          const [, year, month, day, hour, minute] = match;
          return new Date(year, month - 1, day, hour, minute).toISOString();
        }
        return new Date(dateStr).toISOString();
      } catch (error) {
        console.warn('解析时间失败:', dateStr, error);
        return null;
      }
    };
    
    // 处理地理位置信息
    const parseLocation = (locationStr) => {
      if (!locationStr) return null;
      const parts = locationStr.split('\n').filter(Boolean);
      return {
        raw: locationStr,
        formatted: parts.join(', '),
        country: parts.find(p => p === '中国') || null,
        province: parts.find(p => p.includes('省')) || null,
        city: parts.find(p => p.includes('市') || p.includes('区')) || null,
        detail: parts[0] || null
      };
    };

    console.log('[ clientParams ] >', clientParams)

    const clientMetadata = {
      // 文件基本信息
      originalName: clientParams.name || uploadedFile.originalFilename,
      clientSize: clientParams.size ? parseInt(clientParams.size) : null,
      clientType: clientParams.type || null,
      extension: clientParams.extension || null,
      
      // 图片尺寸信息
      width: clientParams.width ? parseInt(clientParams.width) : null,
      height: clientParams.height ? parseInt(clientParams.height) : null,
      
      // 时间信息
      shotTime: parseShortcutDate(clientParams.shotTime),
      createDate: parseShortcutDate(clientParams.createDate),
      modifyDate: parseShortcutDate(clientParams.modifyDate),
      
      // 设备信息
      device: clientParams.device || null,
      
      // 位置信息
      location: parseLocation(clientParams.location),
      
      // 原始参数（调试用）
      rawParams: clientParams
    };
    
    console.log('文件信息:', {
      file: {
        name: uploadedFile.originalFilename,
        size: uploadedFile.size,
        type: uploadedFile.mimetype
      },
      client: clientMetadata
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
      originalName: clientMetadata.originalName || uploadedFile.originalFilename,
      size: fileBuffer.length,
      mimeType: mimeType
    });
    
    // 合并时间信息：优先使用快捷指令提供的时间，其次是EXIF时间
    const finalShotTime = clientMetadata.shotTime || 
                          imageSummary.shotTime || 
                          clientMetadata.createDate || 
                          new Date().toISOString();
    
    // 合并尺寸信息：优先使用客户端传来的尺寸，其次是EXIF尺寸
    const finalDimensions = {
      width: clientMetadata.width || imageSummary.dimensions?.width || null,
      height: clientMetadata.height || imageSummary.dimensions?.height || null,
      orientation: imageSummary.dimensions?.orientation || 1
    };
    
    // 准备元数据
    const metadata = {
      ...uploadResult,
      shotTime: finalShotTime,
      exifData: exifData,
      summary: {
        ...imageSummary,
        shotTime: finalShotTime,
        // 合并设备信息
        device: clientMetadata.device || imageSummary.device,
        // 合并尺寸信息
        dimensions: finalDimensions,
        // 添加位置信息
        location: clientMetadata.location
      },
      // 快捷指令元数据
      clientMetadata: clientMetadata,
      extra: {
        userAgent: req.headers['user-agent'],
        uploadSource: 'ios-shortcuts', // 标识来源
        clientIP: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
        // 文件大小验证
        sizeMatch: clientMetadata.clientSize ? 
          Math.abs(clientMetadata.clientSize - fileBuffer.length) < 1000 : true
      }
    };
    
    // 保存元数据到数据库
    console.log('保存元数据到数据库...', metadata);

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
        originalName: clientMetadata.originalName || uploadResult.originalName,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        uploadTime: metadata.summary.uploadTime,
        shotTime: finalShotTime,
        device: metadata.summary.device,
        dimensions: finalDimensions,
        // 新增位置信息
        location: clientMetadata.location ? {
          city: clientMetadata.location.city,
          province: clientMetadata.location.province,
          country: clientMetadata.location.country,
          formatted: clientMetadata.location.formatted
        } : null,
        // 客户端信息
        clientInfo: {
          device: clientMetadata.device,
          extension: clientMetadata.extension,
          createDate: clientMetadata.createDate,
          modifyDate: clientMetadata.modifyDate,
          // 添加客户端报告的尺寸信息
          originalWidth: clientMetadata.width,
          originalHeight: clientMetadata.height
        }
      },
      message: `豆包照片上传成功！📸 来自 ${clientMetadata.device || '未知设备'} ${clientMetadata.location?.city || ''} 🐱`
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
      errorMessage = '文件太大，请选择小于 50MB 的图片';
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