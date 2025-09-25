#!/bin/bash

echo "启动豆包照片上传服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装npm"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装依赖包..."
    npm install
fi

# 创建uploads目录
mkdir -p uploads

# 启动服务
echo "启动服务器..."
echo "访问 http://localhost:3000 查看应用"
echo "按 Ctrl+C 停止服务"

npm start