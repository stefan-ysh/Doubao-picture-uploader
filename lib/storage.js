import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * 上传图片到 Vercel Blob Storage
 * @param {Buffer} fileBuffer - 图片文件缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} mimeType - MIME 类型
 * @returns {Promise<Object>} 包含 url, pathname 等信息的对象
 */
export async function uploadImage(fileBuffer, originalName, mimeType) {
  try {
    // 生成唯一文件名
    const fileExtension = path.extname(originalName);
    const uniqueId = uuidv4();
    const fileName = `doubao-${uniqueId}${fileExtension}`;
    
    // 按日期组织文件夹结构
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filepath = `images/${year}/${month}/${day}/${fileName}`;
    
    // 上传到 Blob Storage
    const blob = await put(filepath, fileBuffer, {
      access: 'public',
      contentType: mimeType,
    });
    
    return {
      id: uniqueId,
      url: blob.url,
      pathname: blob.pathname,
      fileName: fileName,
      originalName: originalName,
      size: fileBuffer.length,
      mimeType: mimeType,
      uploadPath: filepath
    };
  } catch (error) {
    console.error('上传图片失败:', error);
    throw new Error(`图片上传失败: ${error.message}`);
  }
}

/**
 * 删除图片文件
 * @param {string} pathname - Blob storage 路径
 * @returns {Promise<void>}
 */
export async function deleteImage(pathname) {
  try {
    await del(pathname);
  } catch (error) {
    console.error('删除图片失败:', error);
    throw new Error(`图片删除失败: ${error.message}`);
  }
}

/**
 * 列出所有图片（用于管理）
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 图片列表
 */
export async function listImages(options = {}) {
  try {
    const { blobs } = await list({
      prefix: 'images/',
      limit: options.limit || 100,
      cursor: options.cursor
    });
    return blobs;
  } catch (error) {
    console.error('获取图片列表失败:', error);
    throw new Error(`获取图片列表失败: ${error.message}`);
  }
}

/**
 * 验证图片格式和大小
 * @param {Buffer} fileBuffer - 文件缓冲区
 * @param {string} mimeType - MIME 类型
 * @returns {Object} 验证结果
 */
export function validateImage(fileBuffer, mimeType) {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];
  
  const maxSize = 4 * 1024 * 1024; // 4MB (考虑 Vercel 限制)
  
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `不支持的图片格式: ${mimeType}. 支持的格式: ${allowedTypes.join(', ')}`
    };
  }
  
  if (fileBuffer.length > maxSize) {
    return {
      isValid: false,
      error: `图片大小超过限制 (${Math.round(fileBuffer.length / 1024 / 1024)}MB > 4MB)`
    };
  }
  
  return { isValid: true };
}