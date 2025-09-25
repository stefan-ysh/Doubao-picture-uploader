import { getImageList, searchImages, getStats } from '../../lib/database.js';

/**
 * 图片列表 API
 * GET /api/images
 * 查询参数：
 * - limit: 返回数量限制 (默认 20)
 * - offset: 偏移量 (默认 0)
 * - order: 排序 desc/asc (默认 desc)
 * - search: 搜索关键词 (可选)
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
    // 解析查询参数
    const {
      limit = '20',
      offset = '0',
      order = 'desc',
      search
    } = req.query;
    
    const options = {
      limit: Math.min(parseInt(limit) || 20, 100), // 最多返回 100 条
      offset: parseInt(offset) || 0,
      order: order === 'asc' ? 'asc' : 'desc'
    };
    
    let images = [];
    let total = 0;
    
    if (search) {
      // 搜索模式
      console.log(`搜索图片: "${search}"`);
      images = await searchImages(search, { limit: options.limit });
      total = images.length; // 简化实现，实际应该返回总匹配数
    } else {
      // 列表模式
      console.log('获取图片列表:', options);
      images = await getImageList(options);
      
      // 获取统计信息
      const stats = await getStats();
      total = stats.totalImages;
    }
    
    // 格式化响应数据
    const responseData = images.map(img => ({
      id: img.id,
      fileName: img.fileName,
      originalName: img.originalName,
      url: img.url,
      size: img.size,
      mimeType: img.mimeType,
      uploadTime: img.uploadTime,
      shotTime: img.shotTime,
      device: img.summary?.device || null,
      dimensions: img.summary?.dimensions || null,
      tags: img.tags || ['doubao', 'cat']
    }));
    
    // 计算分页信息
    const hasMore = search ? false : (options.offset + options.limit < total);
    const nextOffset = hasMore ? options.offset + options.limit : null;
    
    return res.status(200).json({
      success: true,
      data: responseData,
      pagination: {
        total: total,
        count: responseData.length,
        limit: options.limit,
        offset: options.offset,
        hasMore: hasMore,
        nextOffset: nextOffset
      },
      query: {
        search: search || null,
        order: options.order
      },
      message: search ? 
        `找到 ${responseData.length} 张匹配的豆包照片` : 
        `获取到 ${responseData.length} 张豆包照片`
    });
    
  } catch (error) {
    console.error('获取图片列表失败:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}