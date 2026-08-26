#!/usr/bin/env bash
# ============================================================================
#  Linux 服务器部署脚本
#  用法: bash scripts/deploy-server.sh
#  触发: GitHub webhook → scripts/webhook-server.js → 本脚本
# ============================================================================
set -e

# ---- 可配置项 ----
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="master"
LOG_FILE="$APP_DIR/deploy.log"
LOCK_FILE="$APP_DIR/.deploy.lock"
NODE_ENV_FILE="$APP_DIR/.env.production"

# ---- 防止并发部署 ----
if [ -f "$LOCK_FILE" ]; then
  echo "[$(date)] 上一次部署还在进行中，忽略本次触发。" | tee -a "$LOG_FILE"
  exit 0
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "========== 开始部署 =========="
cd "$APP_DIR"

# 1. 拉取最新代码
log "[1/5] git fetch + reset 到 origin/$BRANCH ..."
git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1
git reset --hard "origin/$BRANCH" >> "$LOG_FILE" 2>&1

# 2. 安装依赖
log "[2/5] npm ci ..."
npm ci --no-audit --no-fund >> "$LOG_FILE" 2>&1

# 3. 构建（prebuild 自动生成 content-data.ts）
log "[3/5] npm run build ..."
npm run build >> "$LOG_FILE" 2>&1

# 4. 拷贝 static / public 到 standalone
log "[4/5] 拷贝 .next/static 和 public ..."
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

# 5. pm2 重启（或首次启动）
log "[5/5] pm2 reload-or-start ..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs >> "$LOG_FILE" 2>&1 || \
  pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1
  pm2 save >> "$LOG_FILE" 2>&1
else
  log "警告: 未安装 pm2，使用 node 直接拉起（适合首次部署）"
  pkill -f "standalone/server.js" 2>/dev/null || true
  nohup node .next/standalone/server.js >> "$APP_DIR/server.log" 2>&1 &
  echo $! > "$APP_DIR/server.pid"
fi

log "✅ 部署完成，网站已更新。"
log "================================"
