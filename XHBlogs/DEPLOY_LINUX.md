# XHBlogS2 Linux 服务器部署指南

> 完全脱离 Cloudflare，改用自有 Linux 服务器 + GitHub Webhook 自动部署。
> 访问方式：`http://服务器IP:4000`

---

## 0. 一次性环境准备（Ubuntu/Debian）

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# pm2（进程守护）
sudo npm i -g pm2
pm2 startup   # 按提示把 pm2 设为开机自启
```

## 1. 首次克隆 + 部署

```bash
cd /opt
sudo git clone https://github.com/ShuRuMingZi1145/XHBlogS2.git xhblog
cd xhblog/XHBlogs

# 安装依赖（Linux 不会卡 OpenNext）
npm ci

# 首次构建 + 启动
npm run build
pm2 start ecosystem.config.cjs
pm2 save

# 看日志
pm2 logs xhblog-next
```

启动成功后访问 `http://服务器IP:4000`。

## 2. 配置 GitHub Webhook（自动部署）

### 2.1 服务器设置 secret

```bash
# 生成随机 secret
openssl rand -hex 32

# 编辑 ecosystem.config.cjs，把 secret 填到 xhblog-webhook 的 env.WEBHOOK_SECRET
# 或者在 /etc/environment 里加：
echo 'WEBHOOK_SECRET=上面生成的字符串' | sudo tee -a /etc/environment
sudo pm2 restart xhblog-webhook
```

### 2.2 GitHub 仓库设置

进入 `https://github.com/ShuRuMingZi1145/XHBlogS2/settings/hooks/new`

- **Payload URL**：`http://服务器IP:9000/webhook`
- **Content type**：`application/json`
- **Secret**：填上面生成的 secret
- **SSL verification**：Disable（自签证书才需要，公网 HTTP 不打勾）
- **触发事件**：只勾 `Push` events

保存即可。

### 2.3 服务器放行端口

```bash
sudo ufw allow 4000/tcp   # 网站
sudo ufw allow 9000/tcp   # Webhook
```

## 3. 部署流程回顾

```
Windows CMS 面板
   └─ 点 "☁️ 一键部署到 GitHub"
       └─ git push origin master
           └─ GitHub 收到 push，POST http://服务器IP:9000/webhook
               └─ webhook-server.js 校验签名 → spawn deploy-server.sh
                   ├─ git fetch + reset --hard origin/master
                   ├─ npm ci
                   ├─ npm run build（含 prebuild 生成 content-data.ts）
                   ├─ cp static + public 到 standalone
                   └─ pm2 reload xhblog-next
                       └─ 0 停机重启 ✅
```

## 4. 常用运维命令

```bash
# 看所有服务状态
pm2 ls

# 实时日志
pm2 logs xhblog-next
pm2 logs xhblog-webhook

# 手动触发部署（不通过 webhook）
bash scripts/deploy-server.sh

# 重启单个应用
pm2 restart xhblog-next

# 健康检查
curl http://localhost:4000
curl http://localhost:9000/health

# 删除应用
pm2 delete xhblog-next
pm2 delete xhblog-webhook
```

## 5. 反向代理 + HTTPS（可选）

如果想套 Cloudflare 或自有域名，nginx 反代示例：

```nginx
server {
  listen 80;
  server_name your.domain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

然后用 certbot 一键 HTTPS：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

## 6. 故障排查

| 现象 | 排查 |
|------|------|
| Webhook 没触发 | 看 `pm2 logs xhblog-webhook`；GitHub 仓库 → Settings → Webhooks → Recent Deliveries 看响应 |
| 部署失败 | 看 `deploy.log`（项目根目录）和 `pm2 logs xhblog-next` |
| 网站 502 | `pm2 restart xhblog-next`；检查 `.next/standalone/server.js` 是否存在（需要先 `npm run build`） |
| 内容没更新 | 看 `data/content-data.ts` 是否被 `prebuild` 重新生成 |

## 7. 端口规划

| 端口 | 用途 |
|------|------|
| 4000 | Next.js 主站 |
| 9000 | GitHub Webhook 接收（仅服务器本地 + GitHub 可访问，不开放公网也行，GitHub 能 POST 到即可） |

Webhook 端口不需要对外暴露给用户，只对 GitHub 开放即可。
