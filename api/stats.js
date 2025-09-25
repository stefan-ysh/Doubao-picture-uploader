import { getStats } from '../lib/database.js';

/**
 * 统计信息 API
 * GET /api/stats
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
    console.log('获取统计信息...');
    
    const stats = await getStats();
    
    // 计算一些有趣的统计
    const totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    const averageSize = stats.totalImages > 0 ? 
      ((stats.totalSize / stats.totalImages) / 1024).toFixed(1) : 0;
    
    const responseData = {
      // 基础统计
      totalImages: stats.totalImages,
      totalSize: stats.totalSize,
      totalSizeMB: parseFloat(totalSizeMB),
      averageSizeKB: parseFloat(averageSize),
      
      // 时间信息
      lastUpdated: stats.lastUpdated,
      serviceStatus: 'running',
      
      // 有趣的信息
      funFacts: {
        description: '豆包照片收藏统计',
        emoji: '📸🐱',
        message: stats.totalImages > 0 ? 
          `已经收集了 ${stats.totalImages} 张豆包的珍贵时刻！` : 
          '还没有豆包的照片，快来上传第一张吧！'
      }
    };
    
    return res.status(200).json({
      success: true,
      data: responseData,
      message: '统计信息获取成功'
    });
    
  } catch (error) {
    console.error('获取统计信息失败:', error);
    
    // 即使统计失败也返回基础信息
    return res.status(200).json({
      success: true,
      data: {
        totalImages: 0,
        totalSize: 0,
        totalSizeMB: 0,
        averageSizeKB: 0,
        lastUpdated: new Date().toISOString(),
        serviceStatus: 'running',
        funFacts: {
          description: '豆包照片收藏统计',
          emoji: '📸🐱',
          message: '统计数据暂时不可用，但服务正常运行中'
        },
        error: error.message
      },
      message: '统计信息获取成功（部分数据不可用）'
    });
  }
}