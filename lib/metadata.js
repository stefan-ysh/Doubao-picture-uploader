import ExifParser from 'exif-parser';

/**
 * 提取图片 EXIF 元数据
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @returns {Object} EXIF 数据和提取的关键信息
 */
export function extractExifData(imageBuffer) {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    
    const exifData = {
      // 原始 EXIF 数据
      raw: result,
      
      // 提取的关键信息
      dateTime: null,
      camera: {
        make: result.tags?.Make || null,
        model: result.tags?.Model || null,
        software: result.tags?.Software || null
      },
      settings: {
        iso: result.tags?.ISO || null,
        fNumber: result.tags?.FNumber || null,
        exposureTime: result.tags?.ExposureTime || null,
        focalLength: result.tags?.FocalLength || null,
        flash: result.tags?.Flash || null
      },
      gps: {
        latitude: null,
        longitude: null,
        altitude: result.tags?.GPSAltitude || null
      },
      image: {
        width: result.imageSize?.width || result.tags?.ExifImageWidth || null,
        height: result.imageSize?.height || result.tags?.ExifImageHeight || null,
        orientation: result.tags?.Orientation || 1,
        colorSpace: result.tags?.ColorSpace || null
      }
    };
    
    // 处理拍摄时间
    if (result.tags?.DateTimeOriginal) {
      exifData.dateTime = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
    } else if (result.tags?.DateTime) {
      exifData.dateTime = new Date(result.tags.DateTime * 1000).toISOString();
    }
    
    // 处理GPS信息
    if (result.tags?.GPSLatitude && result.tags?.GPSLongitude) {
      exifData.gps.latitude = result.tags.GPSLatitude;
      exifData.gps.longitude = result.tags.GPSLongitude;
      
      // 处理GPS方向
      if (result.tags?.GPSLatitudeRef === 'S') {
        exifData.gps.latitude *= -1;
      }
      if (result.tags?.GPSLongitudeRef === 'W') {
        exifData.gps.longitude *= -1;
      }
    }
    
    return exifData;
  } catch (error) {
    console.warn('EXIF 数据提取失败:', error.message);
    return {
      raw: null,
      dateTime: null,
      camera: { make: null, model: null, software: null },
      settings: { iso: null, fNumber: null, exposureTime: null, focalLength: null, flash: null },
      gps: { latitude: null, longitude: null, altitude: null },
      image: { width: null, height: null, orientation: 1, colorSpace: null },
      error: error.message
    };
  }
}

/**
 * 生成图片摘要信息
 * @param {Object} exifData - EXIF 数据
 * @param {Object} fileInfo - 文件基本信息
 * @returns {Object} 图片摘要
 */
export function generateImageSummary(exifData, fileInfo) {
  const summary = {
    // 基本信息
    fileName: fileInfo.originalName,
    fileSize: fileInfo.size,
    mimeType: fileInfo.mimeType,
    uploadTime: new Date().toISOString(),
    
    // 拍摄信息
    shotTime: exifData.dateTime || new Date().toISOString(),
    
    // 设备信息
    device: null,
    
    // 位置信息（可选）
    location: null,
    
    // 图片尺寸
    dimensions: {
      width: exifData.image.width,
      height: exifData.image.height,
      orientation: exifData.image.orientation
    },
    
    // 拍摄参数
    photoSettings: {
      iso: exifData.settings.iso,
      aperture: exifData.settings.fNumber,
      shutterSpeed: exifData.settings.exposureTime,
      focalLength: exifData.settings.focalLength
    }
  };
  
  // 组合设备名称
  if (exifData.camera.make && exifData.camera.model) {
    summary.device = `${exifData.camera.make} ${exifData.camera.model}`.trim();
  }
  
  // GPS 位置信息（隐私考虑，默认不保存具体坐标）
  if (exifData.gps.latitude && exifData.gps.longitude) {
    summary.location = {
      hasGPS: true,
      // 出于隐私考虑，不直接暴露精确坐标
      // latitude: exifData.gps.latitude,
      // longitude: exifData.gps.longitude,
    };
  }
  
  return summary;
}

/**
 * 验证图片完整性
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @param {string} mimeType - MIME 类型
 * @returns {Object} 验证结果
 */
export function validateImageIntegrity(imageBuffer, mimeType) {
  try {
    // 检查文件头
    const validHeaders = {
      'image/jpeg': [0xFF, 0xD8],
      'image/jpg': [0xFF, 0xD8],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/webp': [0x52, 0x49, 0x46, 0x46] // RIFF
    };
    
    const header = validHeaders[mimeType.toLowerCase()];
    if (header) {
      for (let i = 0; i < header.length; i++) {
        if (imageBuffer[i] !== header[i]) {
          return {
            isValid: false,
            error: '文件头不匹配，可能不是有效的图片文件'
          };
        }
      }
    }
    
    // 尝试解析基本信息验证完整性
    try {
      extractExifData(imageBuffer);
    } catch (error) {
      // EXIF 解析失败不一定意味着图片损坏
      console.warn('EXIF 解析警告:', error.message);
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `图片完整性验证失败: ${error.message}`
    };
  }
}