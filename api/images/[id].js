import { getImageById } from '../../lib/database.js';

/**
 * 单个图片详情 API
 * GET /api/images/[id]
 */
export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: '只支持 GET 请求',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    const { id } = req.query;
    
    // 验证 ID 参数
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少有效的图片 ID',
        code: 'INVALID_ID'
      });
    }
    
    console.log(`获取图片详情: ${id}`);
    
    // 从数据库获取图片信息
    const image = await getImageById(id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        error: '图片不存在',
        code: 'IMAGE_NOT_FOUND'
      });
    }
    
    // 格式化详细信息
    const detailData = {
      // 基本信息
      id: image.id,
      fileName: image.fileName,
      originalName: image.originalName,
      url: image.url,
      size: image.size,
      mimeType: image.mimeType,
      
      // 时间信息
      uploadTime: image.uploadTime,
      shotTime: image.shotTime,
      
      // 设备和拍摄信息
      device: image.summary?.device || null,
      dimensions: image.summary?.dimensions || null,
      photoSettings: image.summary?.photoSettings || null,
      
      // 标签和分类
      tags: image.tags || ['doubao', 'cat'],
      
      // EXIF 详细信息（可选）
      exif: image.exifData ? {
        camera: image.exifData.camera,
        settings: image.exifData.settings,
        image: image.exifData.image,
        hasGPS: image.exifData.gps?.latitude ? true : false
      } : null,
      
      // 上传信息
      uploadSource: image.extra?.uploadSource || 'unknown',
      uploadPath: image.uploadPath
    };
    
    return res.status(200).json({
      success: true,
      data: detailData,
      message: `豆包照片详情 - ${image.originalName}`
    });
    
  } catch (error) {
    console.error('获取图片详情失败:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}