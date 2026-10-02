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

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ---- 失败保护 ----
# next build 一开始就会清空 .next/（包括正在运行的 .next/standalone），
# 如果构建中途失败又直接退出，旧进程的静态文件会被删掉 → 整站静态资源 500 → 白屏。
# 所以构建前先把 .next 备份成 .next.bak，失败时自动还原并重启。
rollback_on_failure() {
  local code=$?
  rm -f "$LOCK_FILE"
  if [ "$code" -ne 0 ] && [ -d "$APP_DIR/.next.bak" ] && [ ! -f "$APP_DIR/.next/standalone/server.js" ]; then
    log "⚠️  部署失败（退出码 $code），正在回滚到上一次构建产物 ..."
    rm -rf "$APP_DIR/.next"
    mv "$APP_DIR/.next.bak" "$APP_DIR/.next"
    if command -v pm2 >/dev/null 2>&1; then
      pm2 reload ecosystem.config.cjs >> "$LOG_FILE" 2>&1 || pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1 || true
    fi
    log "↩️  已回滚，站点恢复到上一次部署的版本。"
  fi
}
trap rollback_on_failure EXIT

log "========== 开始部署 =========="
cd "$APP_DIR"

# 1. 拉取最新代码（网络抖动时最多重试 3 次）
log "[1/5] git fetch + reset 到 origin/$BRANCH ..."
for i in 1 2 3; do
  if git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
    break
  fi
  if [ "$i" -eq 3 ]; then
    log "❌ git fetch 连续 3 次失败，中止本次部署（站点保持原样）。"
    exit 1
  fi
  log "⚠️  git fetch 第 $i 次失败，10 秒后重试 ..."
  sleep 10
done
git reset --hard "origin/$BRANCH" >> "$LOG_FILE" 2>&1

# 2. 安装依赖（使用国内镜像加速）
#    注意：pm2 里的 webhook 进程带着 NODE_ENV=production，会被 npm ci 继承，
#    npm 会因此跳过 devDependencies（tailwindcss / @tailwindcss/postcss / typescript 等），
#    next build 随后就会报 "Cannot find module '@tailwindcss/postcss'" 而失败。
#    所以这里必须 unset NODE_ENV 并显式 --include=dev。
log "[2/5] npm ci (含 devDependencies) ..."
unset NODE_ENV
npm config set registry https://registry.npmmirror.com
npm ci --include=dev --no-audit --no-fund >> "$LOG_FILE" 2>&1

# 3. 构建（prebuild 自动生成 content-data.ts）
log "[3/5] 备份旧产物并 npm run build ..."
rm -rf .next.bak
if [ -d .next ]; then mv .next .next.bak; fi
npm run build >> "$LOG_FILE" 2>&1

# 4. 拷贝 static / public 到 standalone
log "[4/5] 校验构建产物并拷贝 .next/static 和 public ..."
if [ ! -f .next/standalone/server.js ]; then
  log "❌ 构建产物缺少 .next/standalone/server.js，终止部署并回滚"
  exit 1
fi
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public
fi
rm -rf .next.bak

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
