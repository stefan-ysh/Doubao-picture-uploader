/**
 * 错误处理和响应工具
 */

/**
 * 标准错误响应格式
 */
export const ErrorCodes = {
  // 客户端错误 4xx
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_PARAMETER: 'MISSING_PARAMETER', 
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
  INVALID_IMAGE: 'INVALID_IMAGE',
  CORRUPTED_IMAGE: 'CORRUPTED_IMAGE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  
  // 服务器错误 5xx
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * 创建标准错误响应
 * @param {string} code - 错误代码
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP 状态码
 * @param {Object} extra - 额外信息
 * @returns {Object} 标准错误响应
 */
export function createErrorResponse(code, message, statusCode = 500, extra = {}) {
  return {
    success: false,
    error: message,
    code: code,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

/**
 * 发送错误响应
 * @param {Object} res - Express 响应对象
 * @param {string} code - 错误代码
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP 状态码
 * @param {Object} extra - 额外信息
 */
export function sendError(res, code, message, statusCode = 500, extra = {}) {
  const errorResponse = createErrorResponse(code, message, statusCode, extra);
  return res.status(statusCode).json(errorResponse);
}

/**
 * 验证请求方法
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {string|Array} allowedMethods - 允许的方法
 * @returns {boolean} 是否通过验证
 */
export function validateMethod(req, res, allowedMethods) {
  const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.status(200).end();
    return false;
  }
  
  if (!methods.includes(req.method)) {
    sendError(res, ErrorCodes.METHOD_NOT_ALLOWED, 
      `只支持 ${methods.join(', ')} 请求`, 405);
    return false;
  }
  
  return true;
}

/**
 * 设置 CORS 头
 * @param {Object} res - 响应对象
 * @param {Object} options - CORS 选项
 */
export function setCorsHeaders(res, options = {}) {
  const {
    origin = '*',
    methods = 'GET, POST, PUT, DELETE, OPTIONS',
    headers = 'Content-Type, Authorization'
  } = options;
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', headers);
}

/**
 * 验证必需参数
 * @param {Object} params - 参数对象
 * @param {Array} required - 必需参数列表
 * @returns {Object} 验证结果
 */
export function validateRequiredParams(params, required) {
  const missing = [];
  const invalid = [];
  
  for (const param of required) {
    const value = params[param];
    
    if (value === undefined || value === null) {
      missing.push(param);
    } else if (typeof value === 'string' && value.trim() === '') {
      invalid.push(param);
    }
  }
  
  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    errors: [
      ...missing.map(p => `缺少必需参数: ${p}`),
      ...invalid.map(p => `参数不能为空: ${p}`)
    ]
  };
}

/**
 * 验证分页参数
 * @param {Object} query - 查询参数
 * @returns {Object} 验证和格式化后的分页参数
 */
export function validatePaginationParams(query) {
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = Math.max(parseInt(query.offset) || 0, 0);
  const order = ['asc', 'desc'].includes(query.order) ? query.order : 'desc';
  
  return { limit, offset, order };
}

/**
 * 安全日志记录（避免记录敏感信息）
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 数据对象
 */
export function safeLog(level, message, data = {}) {
  const safeData = { ...data };
  
  // 移除敏感信息
  delete safeData.password;
  delete safeData.token;
  delete safeData.apiKey;
  
  // 截断长字符串
  Object.keys(safeData).forEach(key => {
    if (typeof safeData[key] === 'string' && safeData[key].length > 200) {
      safeData[key] = safeData[key].substring(0, 200) + '...';
    }
  });
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeData
  };
  
  console[level] || console.log(JSON.stringify(logEntry));
}

/**
 * 异步错误处理包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
export function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error('API 错误:', error);
      
      // 根据错误类型返回相应的状态码
      let statusCode = 500;
      let errorCode = ErrorCodes.INTERNAL_ERROR;
      
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = ErrorCodes.INVALID_PARAMETER;
      } else if (error.message?.includes('not found')) {
        statusCode = 404;
        errorCode = ErrorCodes.IMAGE_NOT_FOUND;
      }
      
      sendError(res, errorCode, error.message, statusCode);
    }
  };
}

/**
 * 创建成功响应
 * @param {Object} data - 数据
 * @param {string} message - 成功消息
 * @param {Object} meta - 元数据
 * @returns {Object} 标准成功响应
 */
export function createSuccessResponse(data, message = '操作成功', meta = {}) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
}