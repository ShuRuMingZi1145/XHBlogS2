FROM node:20-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（先安装生产依赖，然后重新安装 devDependencies以确保构建工具存在）
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用（.next/standalone/server.js 会自动生成）
RUN npm run build

# 清理开发依赖，缩小镜像
RUN npm prune --production

# 暴露端口
EXPOSE 4000 9000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q http://localhost:4000 || exit 1

# 启动 webhook 服务器（9000）和 Next.js 服务（4000）
CMD ["sh", "-c", "npm install -g pm2 && pm2 start ecosystem.config.cjs && pm2 logs"]
