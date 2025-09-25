# 豆包照片上传器 Docker 配置
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 3000

# 设置用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S doubao -u 1001
RUN chown -R doubao:nodejs /app
USER doubao

# 启动应用
CMD ["npm", "start"]