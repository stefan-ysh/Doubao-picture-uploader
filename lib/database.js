import { kv } from '@vercel/kv';

/**
 * 保存图片元数据到 KV 数据库
 * @param {string} imageId - 图片唯一ID
 * @param {Object} metadata - 图片元数据
 * @returns {Promise<void>}
 */
export async function saveImageMetadata(imageId, metadata) {
  try {
    const imageData = {
      id: imageId,
      fileName: metadata.fileName,
      originalName: metadata.originalName,
      url: metadata.url,
      pathname: metadata.pathname,
      size: metadata.size,
      mimeType: metadata.mimeType,
      uploadTime: new Date().toISOString(),
      shotTime: metadata.shotTime || null,
      exifData: metadata.exifData || null,
      uploadPath: metadata.uploadPath,
      tags: ['doubao', 'cat'], // 默认标签
      ...metadata.extra // 额外的元数据
    };
    
    // 保存到 KV，key 格式: image:{id}
    await kv.set(`image:${imageId}`, imageData);
    
    // 同时维护一个按时间排序的列表
    await kv.zadd('images:timeline', {
      score: Date.now(),
      member: imageId
    });
    
    // 更新统计信息
    await kv.incr('stats:total_images');
    
    console.log(`图片元数据已保存: ${imageId}`);
  } catch (error) {
    console.error('保存图片元数据失败:', error);
    throw new Error(`保存图片元数据失败: ${error.message}`);
  }
}

/**
 * 根据ID获取图片信息
 * @param {string} imageId - 图片ID
 * @returns {Promise<Object|null>} 图片信息
 */
export async function getImageById(imageId) {
  try {
    const imageData = await kv.get(`image:${imageId}`);
    return imageData;
  } catch (error) {
    console.error('获取图片信息失败:', error);
    throw new Error(`获取图片信息失败: ${error.message}`);
  }
}

/**
 * 获取图片列表（按时间排序）
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 图片列表
 */
export async function getImageList(options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      order = 'desc' // desc: 最新的在前, asc: 最旧的在前
    } = options;
    
    // 从时间线获取图片ID列表
    const imageIds = await kv.zrange('images:timeline', offset, offset + limit - 1, {
      rev: order === 'desc' // rev=true 表示倒序（最新的在前）
    });
    
    if (!imageIds || imageIds.length === 0) {
      return [];
    }
    
    // 批量获取图片详情
    const imagePromises = imageIds.map(id => kv.get(`image:${id}`));
    const images = await Promise.all(imagePromises);
    
    // 过滤掉空值并返回
    return images.filter(img => img !== null);
  } catch (error) {
    console.error('获取图片列表失败:', error);
    throw new Error(`获取图片列表失败: ${error.message}`);
  }
}

/**
 * 删除图片元数据
 * @param {string} imageId - 图片ID
 * @returns {Promise<void>}
 */
export async function deleteImageMetadata(imageId) {
  try {
    // 删除图片数据
    await kv.del(`image:${imageId}`);
    
    // 从时间线中移除
    await kv.zrem('images:timeline', imageId);
    
    // 更新统计
    await kv.decr('stats:total_images');
    
    console.log(`图片元数据已删除: ${imageId}`);
  } catch (error) {
    console.error('删除图片元数据失败:', error);
    throw new Error(`删除图片元数据失败: ${error.message}`);
  }
}

/**
 * 获取统计信息
 * @returns {Promise<Object>} 统计数据
 */
export async function getStats() {
  try {
    const totalImages = await kv.get('stats:total_images') || 0;
    const totalSize = await kv.get('stats:total_size') || 0;
    
    return {
      totalImages: Number(totalImages),
      totalSize: Number(totalSize),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return {
      totalImages: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * 搜索图片（按标签或文件名）
 * @param {string} query - 搜索关键词
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function searchImages(query, options = {}) {
  try {
    const { limit = 20 } = options;
    
    // 简单实现：获取所有图片然后过滤
    // 生产环境建议使用专门的搜索服务
    const allImages = await getImageList({ limit: 100 });
    
    const searchTerm = query.toLowerCase();
    const results = allImages.filter(img => {
      return img.originalName?.toLowerCase().includes(searchTerm) ||
             img.fileName?.toLowerCase().includes(searchTerm) ||
             img.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
    }).slice(0, limit);
    
    return results;
  } catch (error) {
    console.error('搜索图片失败:', error);
    throw new Error(`搜索图片失败: ${error.message}`);
  }
}