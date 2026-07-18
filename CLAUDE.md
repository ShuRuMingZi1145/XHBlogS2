# 项目完整会话记忆（2026-06-20，后续追加）
## 保存原因：AI 提供商会定期清除上下文，此文件供后续会话恢复
## 语言规则：所有对话必须使用中文，不得使用英文回答（代码/命令/专有名词除外）

---

## 一、项目概览

**项目**：XHBlogS2 — 基于 Next.js 的个人博客系统，部署到 Cloudflare Workers
**用户**：3859282287@qq.com | GitHub: ShuRuMingZi1145
**自定义域名**：https://www.srmz.cn/（DNS 在 Cloudflare 托管）
**Worker URL**：https://xhblogs2.3859282287.workers.dev/

**项目位置**：
- 博客代码：`F:\Users\38592\Desktop\XHBlogS2-main\XHBlogS2-main\XHBlogs\`
- 后台 CMS：`F:\Users\38592\Desktop\XHBlogS2-main\XHBlogS2-main\my-blog-manager\`
- 旧项目位置（已废弃）：`F:\Users\38592\Documents\ModernMC网站\`

**GitHub 仓库**：
- `ShuRuMingZi1145/XHBlogS2` — 博客代码 + CMS 代码（remote origin 已设置）
- `ShuRuMingZi1145/XHBlogS2-comments` — Gitalk 评论数据

**Git 配置**：
- SSH 端口 22 被中国网络封锁 → 改用 HTTPS
- 凭据：Windows Credential Manager + GitHub PAT（git config --global credential.helper manager）
- Remote：`origin = https://github.com/ShuRuMingZi1145/XHBlogS2.git`
- 默认分支：`master`

---

## 二、关键决策历史

1. **Pages → Workers 迁移**：OpenNext 官方目标是 Workers，Pages 的 _worker.js 变通方案返回 500
2. **HTTPS 代替 SSH**：SSH 端口 22 被封锁，改用 HTTPS + Windows Credential Manager
3. **SSH 配置**：`~/.ssh/config` 中 github.com 使用端口 443，密钥为 `id_ed25519_source`（这是个 deploy key，不是个人 key，不能 push 到自己的仓库）
4. **图床**：从 SM.MS/S.EE（¥48/月）切换到 img.scdn.io（免费，无需注册/Token，基于 Telegram 存储无限容量，支持中国 CDN）
5. **Gitalk**：OAuth App clientID=Ov23lipTt025W4gwZ46p，callback URL=https://www.srmz.cn
6. **强制推送**：本地/远程因 rebase 冲突而分叉，使用 `git push --force` 同步（因为只有用户一个人维护，安全）
7. **部署目标**：Cloudflare Workers（不是 Vercel——部署脚本里还有 "Vercel" 字样，应该改为 "Cloudflare Workers"）

---

## 三、部署流水线

### 架构概览
```
CMS 后端 (Windows)              GitHub Actions (Linux)          Cloudflare Workers
┌──────────────────┐          ┌──────────────────────┐        ┌─────────────────┐
│ ☁️ 一键部署按钮   │──git push→│ .github/workflows/   │────────│ xhblogs2         │
│ (处理队列→同步→   │          │ deploy.yml            │build+deploy│ www.srmz.cn      │
│  git push)       │          │ (npm ci → npm run     │        └─────────────────┘
└──────────────────┘          │  deploy)             │
                              └──────────────────────┘
```

**为什么用 GitHub Actions？** OpenNext 在 Windows 上有已知的兼容性问题（无法内联 SSR chunk），而 GitHub Actions 在 Ubuntu Linux 上运行，完全没有这个问题。

### 一键部署流程（"☁️ 一键部署到 GitHub" 按钮）
1. **处理待操作队列** → 根据操作类型路由到不同 API
   - CONFIG → `/api/config/update`
   - create_moment → `/api/moments/save`
   - publish_article → `/api/drafts/sync_local`
2. **同步数据** → `/api/sync/execute`（将文件从 manager 复制到 blog 目录）
3. **Git 推送** → `git add .` → `git commit` → `git pull --rebase --autostash` → `git push`
4. **GitHub Actions 自动触发**（在 Ubuntu Linux 上执行）
   - `npm ci` → `npx opennextjs-cloudflare build` → `npx wrangler deploy`
5. 完成后网站自动更新 🎉

### GitHub Actions 文件
- 位置：`XHBlogs/.github/workflows/deploy.yml`
- 触发条件：push 到 `master` 分支
- 需要 GitHub 仓库 Secret：`CLOUDFLARE_API_TOKEN`
  - 在 Cloudflare Dashboard → My Profile → API Tokens → Create Token
  - 权限：Workers（Edit）
  - 添加到 GitHub 仓库：Settings → Secrets and variables → Actions → New repository secret

### 手动部署命令（在 XHBlogs/ 目录下，仅 Linux/WSL）
```bash
npm run deploy   # 等价于: opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

### Python 后端（CMS）
- 路径：`my-blog-manager/main.py`（或 `python main.py`）
- 端口：从 `backend_config.json` 读取（通常是 9699）
- 修改后需要重启（Ctrl+C 停掉，重新 run）

---

## 四、文件结构与关键文件

### 博客目录（XHBlogs/）— 这是 git 仓库根目录
```
XHBlogs/
├── app/                    # Next.js App Router 页面
│   ├── about/              # 关于页
│   │   └── about.md        # 关于我内容（通过 sync.py 同步）
│   ├── moments/            # 说说页面
│   │   ├── page.tsx        # 服务器组件，从 data/content-data.ts 导入数据
│   │   └── MomentList.tsx  # 客户端组件
│   ├── chatter/            # 絮语页面
│   │   └── [slug]/page.tsx # 动态路由，从 data/content-data.ts 导入数据
│   └── posts/              # 文章页面
├── components/             # 共享组件
├── data/                   # 数据文件（albums.ts, friends.ts, projects.ts, content-data.ts）
├── posts/                  # 文章 .md 文件（通过 sync.py 同步）
├── chatters/               # 絮语 .md 文件
├── moments/                # 说说 .md 文件
├── siteConfig.ts           # 网站配置（标题、bio、Gitalk、图床等）
├── wrangler.toml           # Cloudflare Workers 配置
├── open-next.config.ts     # OpenNext 配置
├── next.config.ts          # Next.js 配置
└── .gitignore
```

### CMS 目录（my-blog-manager/）— Python 后端 + React 前端
```
my-blog-manager/
├── cms_core/api/           # Python FastAPI 接口
│   ├── deploy.py           # Git 推送 + wrangler deploy
│   ├── sync.py             # 文件同步到博客目录
│   ├── drafts.py           # 草稿 + sync_local
│   ├── config.py           # siteConfig.ts 读写
│   ├── moments.py          # 说说 CRUD
│   ├── picbed.py           # 图床上传（支持 smms/scdn/lsky）
│   ├── gallery.py          # 相册
│   └── friends.py          # 友链
├── components/             # React 组件
│   ├── Navbar.tsx          # 导航栏 + 操作队列（🚀更新本地、🔄同步Blog）
│   ├── settings/           # 设置页面组件
│   │   ├── RepoSection.tsx # 仓库配置 + 一键部署
│   │   ├── ProfileSection.tsx # 个人简介编辑
│   │   └── GallerySection.tsx # 图床配置
│   └── ToastProvider.tsx   # 消息提示
├── app/                    # Next.js 前端页面
│   ├── moments/            # 说说管理
│   │   └── MomentList.tsx  # 说说列表 + 发布对话框
│   └── settings/page.tsx   # 设置页
├── context/
│   └── OperationContext.tsx # 操作队列（暂存/发布上下文）
├── data/
│   └── deploy_config.json  # 部署配置（blogPath, sourceRepoUrl, sourceBranch）
├── siteConfig.ts           # 网站配置（CMS 侧）
├── manager_data/drafts/    # 草稿 JSON
└── backend_config.json     # 后端端口等配置
```

---

## 五、修改历史（2026-06-20 会话）

### 已完成的修改

1. **SSH 配置修复**：host = github.com, port = 443

2. **Git 远程设置**：
   - 将 remote origin 从 SSH 改为 HTTPS
   - 将上游分支设置为 origin/master
   - 执行 `git fetch origin` 成功后设置跟踪

3. **deploy.py 修改**：
   - 将 SSH URL 自动转为 HTTPS（行 229-234）
   - 添加 `git pull --rebase --autostash` 防止推送被拒绝（行 237）
   - 检测无变更状态并提示（行 239-240）
   - **添加 `npx opennextjs-cloudflare build` 构建步骤**（行 255-262）
   - **添加 `npx wrangler deploy` 部署步骤**（行 264-271）
   - 将消息从 "Vercel" 改为 "Cloudflare Workers"

4. **RepoSection.tsx 修改**（一键部署按钮）：
   - 导入 `useOperations` 上下文
   - 将 `executeUploadSource` 改为三步流程：
     1. 处理队列（按操作类型路由到正确的 API）
     2. 执行同步（`/api/sync/execute`）
     3. 调用部署 API（`/api/deploy/source`）
   - 修复操作类型路由（CONFIG→config/update, create_moment→moments/save）
   - 按钮文字改为 "☁️ 一键部署到 GitHub" / "全流程部署中..."
   - 确认对话框改为描述完整流程

5. **Navbar.tsx 修改**：
   - 添加 `isUpdating` 加载状态
   - 添加 30s AbortController 超时
   - 处理中禁用按钮

6. **MomentList.tsx 修改**：
   - `handleDirectPublish`（"立即发布"）改为**入队列**而非直接保存
   - 移除异步调用（isSubmitting 状态）
   - 按钮不再显示加载旋转动画

7. **deploy_config.json**：sourceRepoUrl = `git@github.com:ShuRuMingZi1145/XHBlogS2.git`（SSH 地址，代码会自动转 HTTPS）

8. **.gitkeep 文件**：在 posts/, chatters/, moments/ 目录中添加 `.gitkeep` 以保证空目录被 git 追踪
   - Manager 和 Blog 两边都放了
   - 在 Git 中创建了 `chatters/chatter_1781965195.md`
   - 在 Git 中创建了 `moments/moment-1781965173494.md`

9. **同步设置**：`sync.py` 的 SYNC_DIRS=["posts","chatters","moments"]，SYNC_FILES 中 siteConfig.ts 会过滤 picBed 行

10. **picbed.py**：支持三个图床提供商（smms/scdn/lsky），根据 URL 自动检测

11. **GitHub Actions 自动部署**（2026-06-20 14:59）：
    - 创建 `.github/workflows/deploy.yml` — push 到 master 自动构建 + 部署
    - 在 Ubuntu Linux 上运行 OpenNext（彻底解决 Windows 构建问题）
    - 需要用户手动设置 GitHub Secret：`CLOUDFLARE_API_TOKEN`

12. **deploy.py 重构**：移除本地 build + deploy 步骤
    - 一键部署按钮只执行 `git push`（快速）
    - 实际构建和部署由 GitHub Actions 在 Linux 上完成
    - 函数名从 `sync_source_to_vercel` 改为 `sync_source_to_github`
    - 更新所有消息文字

### GitHub Actions 首次设置
1. 创建 Cloudflare API Token：https://dash.cloudflare.com/profile/api-tokens
   - 权限：`Workers` → `Edit`
   - 资源：`All Workers`
2. 添加到 GitHub 仓库 Secrets：`CLOUDFLARE_API_TOKEN`
3. 以后每次 push 到 master 会自动构建并部署

### Git 最新提交（2026-06-20 15:00）
- `935157b` — Add GitHub Actions auto-deploy workflow (builds on Linux, fixes OpenNext 500 issue)

### 回滚记录
当前生产版本：`b321a561-0f13-4e18-b9cc-e1a936724dbd` ✅（正常工作）
回滚命令：`npx wrangler rollback b321a561-0f13-4e18-b9cc-e1a936724dbd`

---

## 六、2026-07-03 会话

### 目标
修复 moments（说说）和 chatters（杂谈）在 Cloudflare Workers 上显示为空的问题。

### 根因
Cloudflare Workers 没有文件系统。`fs.readFileSync` / `fs.readdirSync` 在 Worker 运行时全部抛出异常，被各组件的 `try/catch` 静默吞掉，导致 moments/chatters 返回空数组。OpenNext Cloudflare 将部分服务器组件编译为 Worker 运行时调用，而非构建时静态渲染。

### 已完成的修改

1. **`scripts/generate-content-data.js`（新建）** — 构建时脚本，在 `next build` 前运行：
   - 扫描 `moments/`、`chatters/`、`posts/` 下的 `.md` 文件
   - 解析 frontmatter 和 markdown 正文
   - 生成 `data/content-data.ts`，导出 `momentsData`、`chattersData`、`postsData` 常量
   - 修复 CRLF（`\r\n`）Windows 换行符问题

2. **`data/content-data.ts`（新建）** — 生成的 TypeScript 数据文件（自动生成，勿手动编辑）

3. **`app/moments/page.tsx`** — 改用 import `momentsData`，移除 `fs`、`path`、`gray-matter` 依赖

4. **`app/chatter/page.tsx`** — 改用 import `chattersData`，移除 `fs`、`path`、`gray-matter` 依赖

5. **`app/chatter/[slug]/page.tsx`**：
   - `generateStaticParams` 改为从 `chattersData` 读取 slugs
   - `getChatterData` 改为从 `chattersData` 查询，保留 unified/remark 处理管道
   - `getRecentChatters` 改为从 `chattersData` 过滤排序
   - 添加 `notFound()` 守卫（slug 不存在时返回 404）

6. **`app/posts/[slug]/page.tsx`**：
   - 同上，`generateStaticParams`、`getPostData`、`getRecentPosts` 全部改为用 `postsData`
   - 添加 `notFound()` 守卫

7. **`package.json`**：
   - `prebuild` → `node scripts/generate-content-data.js`
   - `build` → `npm run prebuild && next build`
   - `dev` → `node scripts/generate-content-data.js && next dev`
   - `deploy` → `node scripts/generate-content-data.js && opennextjs-cloudflare build && ...`

### 关键决策
- **不用 `force-static`**：最初尝试加 `export const dynamic = 'force-static'`，但 OpenNext 不一定保证静态渲染。改用构建时生成数据导入更可靠
- **build 脚本用纯 Node.js**：不用 gray-matter 包，避免依赖问题。自实现 frontmatter 解析器支持简单 key-value 和数组
- **`as const` 断言**：生成的数据用 `as const` 确保类型安全

### Git 最新提交（2026-07-03 10:30）
- `03c38bb` — Fix empty moments/chatters on Cloudflare Workers (build-time data generation)

---

### 六-B、2026-07-04 会话：AI 模块自定义 API URL

#### 目标
让 AI 聊天模块（Gemini）支持自定义 API 地址，方便使用反代或兼容接口。

#### 已完成的修改

1. **`XHBlogs/siteConfig.ts`** — `geminiConfig` 新增 `apiUrl` 和 `apiKey` 字段

2. **`my-blog-manager/siteConfig.ts`** — 同上，新增 `apiUrl` 和 `apiKey` 字段

3. **`XHBlogs/app/api/chat/route.ts`** — 将硬编码的 API URL 改为读 `siteConfig.geminiConfig.apiUrl`（去尾斜杠）；`apiKey` 优先读配置，再 fallback 到环境变量 `GEMINI_API_KEY`

4. **`my-blog-manager/app/api/chat/route.ts`** — 同上

5. **`my-blog-manager/components/settings/AICatSection.tsx`** — 在"模型 ID"下方新增"API 地址 (API URL)"和"API 密钥 (API Key)"两个输入框

#### 注意事项
- `config.py` 无需修改：`geminiConfig` 已在 `known_dicts` 和 `VALID_ROOT_KEYS` 白名单中，新增字段会被通用逻辑自动读写
- API URL 末尾不要加斜杠
- API Key 留空则自动使用环境变量 `GEMINI_API_KEY`（通过 `npx wrangler secret put GEMINI_API_KEY` 设置）

---

### 六-C、2026-07-04 会话：Sitemap 网站地图

#### 目标
为网站生成 XML Sitemap，方便搜索引擎收录。

#### 已完成的修改
1. **`XHBlogs/app/sitemap.ts`（新建）** — Next.js App Router sitemap，生成 `/sitemap.xml`
   - 静态页面：`/`, `/about`, `/moments`, `/chatter`, `/posts`, `/friends`, `/projects`, `/photowall`, `/music`, `/timeline`, `/tree`
   - 动态页面：`/chatter/[slug]`, `/posts/[slug]`（从 `content-data.ts` 读取）
   - 域名：`https://www.srmz.cn`
   - 优先级和更新频率按页面类型分层

#### 注意事项
- `sitemap.ts` 在 `next build` 期间执行，自动包含最新生成的 `chattersData`/`postsData`
- 访问 `/sitemap.xml` 查看生成的 sitemap

---

### 六-D、2026-07-04 会话：导航栏加"文章"、修复首页 fs 调用、新建文章列表页

#### 目标
解决"文章"按钮不在导航栏、部署后文章不显示、首页用 fs 读取文章在 Workers 上崩溃的问题。

#### 已完成的修改

1. **`XHBlogs/components/Navbar.tsx`** — `navLinks` 新增 `{ name: '文章', href: '/posts' }`

2. **`my-blog-manager/components/Navbar.tsx`** — 同上，新增"文章"链接

3. **`XHBlogs/app/page.tsx`** — 移除 `fs`、`path`、`gray-matter` 依赖，改为从 `content-data.ts` import `postsData` 和 `chattersData`，彻底解决首页在 Workers 上不显示文章/杂谈的问题

4. **`XHBlogs/app/posts/page.tsx`（新建）** — 文章列表页，从 `postsData` 读取，显示标题、日期、标签、封面、摘要，点击进详情页

#### 注意事项
- 首页之前和 moments/chatters 一样用了 `fs.readdirSync`，在 Workers 上 crash 但被 try/catch 吞掉，导致首页显示"暂无文章"
- 文章列表页路由 `/posts` 需要 `npm run build` 生成，`postsData` 由 prebuild 脚本自动生成
- 创建文章后通过"☁️ 一键部署"发布，GitHub Actions 构建时会重新生成 `content-data.ts`，文章就会出现在列表页

---

## 七、关键操作流程

### 编辑内容 → 上线（应该怎么用）
1. 编辑内容（bio/说说/文章等）
2. 如果操作创建了队列项目（通过"暂存修改至操作队列"、"发布"、"立即发布"等按钮）
3. 去设置页点 **☁️ 一键部署到 GitHub**
4. 按钮会自动：处理队列 → 同步 → git push
5. GitHub Actions 自动触发 → 在 Linux 上构建 → 部署到 Cloudflare Workers（等待 2-3 分钟）
6. 可在 GitHub 仓库 Actions 标签页查看构建日志

### 操作队列类型
| 类型 | 创建位置 | 处理 API |
|------|---------|----------|
| CONFIG | 设置页 → 暂存修改至操作队列 | /api/config/update |
| create_moment | 说说 → 立即发布/加入队列 | /api/moments/save |
| publish_article | 编辑器 → 发布 | /api/drafts/sync_local |

### 同步文件列表（sync.py）
- 目录（全量覆盖）：posts, chatters, moments
- 单文件：app/about/about.md, data/albums.ts, data/friends.ts, data/projects.ts, siteConfig.ts（过滤 picBed 行）

---

## 八、网站地图

### 路由（所有页面正常返回 200，API 路由除外）
| 路径 | 类型 | 状态 |
|------|------|------|
| / | Static | ✅ 200 |
| /about | Static | ✅ 200 |
| /moments | Static | ✅ 200 |
| /chatter | Static | ✅ 200 |
| /chatter/[slug] | SSG | ✅ 200 |
| /posts/[slug] | SSG |  |
| /friends | Static |  |
| /projects | Static |  |
| /photowall | Static |  |
| /music | Static |  |
| /timeline | Static |  |
| /tree | Static |  |
| /api/chat | Dynamic (edge) | ❌ 500（缺 GEMINI_API_KEY） |
| /api/github | Dynamic | ❌ 500 |
| /api/music | Dynamic |  |
| /api/test | Dynamic |  |
| /api/weather | Dynamic | ❌ 500（缺 QWEATHER_KEY） |

### 缺少的环境变量（需要设置才能让 API 路由工作）
- GEMINI_API_KEY
- OPENAI_API_KEY
- QWEATHER_KEY

设置方式：`npx wrangler secret put GEMINI_API_KEY`

---

## 九、图床配置

**当前提供商：img.scdn.io**（免费，无限容量）
- URL：`https://img.scdn.io`
- 上传端点：`POST /api/v1.php`
- 表单字段：`image`（单文件）
- 认证：无需 Token
- 支持 Telegram 存储（无限）
- 支持中国 CDN（ESA-大陆 / EdgeOne-大陆）
- 频率限制：5 请求/5 秒，120 请求/分钟

**picbed.py 支持三个提供商**：
- SM.MS / S.EE（smms）— 需要 Token，¥48/月
- img.scdn.io（scdn）— 免费，当前使用的
- Lsky Pro（lsky）— 自建，需要 URL + Token

---

## 十、关键命令速查

```powershell
# 启动 Python 后端
cd my-blog-manager
python main.py

# 构建并部署
cd XHBlogs
npm run deploy

# 或分别执行
npx opennextjs-cloudflare build
npx wrangler deploy

# 回滚到指定版本
npx wrangler rollback <version-id>

# 查看版本列表
npx wrangler deployments list

# 查看所有版本
npx wrangler versions list

# 监听日志
npx wrangler tail xhblogs2 --format=pretty

# 设置环境变量
npx wrangler secret put GEMINI_API_KEY

# Git 操作
git add .
git commit -m "message"
git push origin master
git pull --rebase --autostash
```

---

## 十一、注意事项

1. **Python 后端修改后需要重启**（Ctrl+C 停止，重新 run）
2. **OpenNext 在 Windows 上不稳定** — 构建可能产生坏 worker，多试几次或换 WSL/Linux
3. **sync.py 过滤敏感信息** — 复制 siteConfig.ts 时会跳过 picBed 配置行
4. **deploy_config.json 用 SSH 地址** — deploy.py 会自动转 HTTPS
5. **Windows Credential Manager** 中存储了 GitHub PAT，不要删除
6. **数据读取从运行时 fs 改为构建时生成** — `scripts/generate-content-data.js` 在 build 前运行，生成 `data/content-data.ts`，页面从该文件 import 数据。Cloudflare Workers 没有文件系统，故不能运行时调用 fs
7. **远程仓库已同步**（最新 commit `03c38bb` 已推送）
8. **本地构建问题已解决** — 不再在 Windows 上构建，改用 GitHub Actions（Linux）
9. **GitHub Actions 需要设置 Secret：CLOUDFLARE_API_TOKEN** — 见上方"首次设置"
