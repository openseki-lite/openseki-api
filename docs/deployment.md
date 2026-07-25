# 部署步骤

## 前置条件

- 一个域名，并已接入 Cloudflare
- Cloudflare 账号
- Vercel 账号
- GitHub 账号
- 本地安装 Node.js 18+

---

## 第一阶段：部署 Cloudflare 缓存服务

### 1.1 准备域名

1. 登录 Cloudflare
2. 添加域名，修改 NS 记录到 Cloudflare
3. 添加 DNS 记录：
   - 类型：A
   - 名称：`cdn`
   - 内容：`192.0.2.1`
   - 代理状态：已代理（橙色云）

### 1.2 创建 R2 存储桶

1. 进入 R2 控制台
2. 创建存储桶：`resource-cache`
3. （可选）配置生命周期规则

### 1.3 创建 D1 数据库

```bash
npx wrangler d1 create resource-cache-db
```

初始化表结构：

```bash
npx wrangler d1 execute resource-cache-db --file=./schema.sql
```

### 1.4 创建 Worker

项目目录结构：

```
cache-proxy/
├── worker.js
├── schema.sql
├── wrangler.toml
└── package.json
```

`wrangler.toml`：

```toml
name = "resource-proxy"
main = "worker.js"
compatibility_date = "2026-07-24"

[[r2_buckets]]
binding = "CACHE_BUCKET"
bucket_name = "resource-cache"

[[d1_databases]]
binding = "DB"
database_name = "resource-cache-db"
database_id = "your-database-id"

[routes]
pattern = "cdn.yourdomain.com/*"
custom_domain = true

[vars]
DEFAULT_ORIGIN = "https://your-origin-server.com"
CACHE_TTL = "604800"
```

设置 API Token（不要硬编码）：

```bash
npx wrangler secret put API_TOKEN
```

### 1.5 部署 Worker

```bash
npm install
npx wrangler deploy
```

### 1.7 测试

```bash
curl -I https://cdn.yourdomain.com/test.jpg
```

观察响应头：

```
CF-Cache-Status: MISS
Cache-Control: public, max-age=604800
```

再次请求应看到：

```
CF-Cache-Status: HIT
```

---

## 第二阶段：部署 Nuxt 3 前端

### 2.1 创建项目

```bash
npx nuxi@latest init web-admin
cd web-admin
npm install
```

### 2.2 安装依赖

```bash
npm install @element-plus/nuxt pinia @pinia/nuxt
```

### 2.3 配置环境变量

创建 `.env`：

```bash
CACHE_API_BASE=https://cdn.yourdomain.com
CACHE_API_TOKEN=your-secure-random-token
NUXT_SESSION_PASSWORD=your-session-secret
```

### 2.4 编写管理页面

参考 [frontend.md](./frontend.md) 中的项目结构。

### 2.5 本地测试

```bash
npm run dev
```

### 2.6 推送到 GitHub

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/yourname/web-admin.git
git push -u origin main
```

### 2.7 部署到 Vercel

1. 登录 Vercel，导入 GitHub 项目
2. 配置环境变量
3. 部署

### 2.8 绑定域名

1. 在 Vercel 添加自定义域名 `admin.yourdomain.com`
2. 在 Cloudflare 添加 CNAME 记录：
   - 类型：CNAME
   - 名称：`admin`
   - 内容：`cname.vercel-dns.com`
   - 代理状态：DNS only（灰色云）

---

## 第三阶段：配置与优化

### 3.1 添加源站配置

登录管理后台，添加源站路由：

> 注意：Worker 内使用内存缓存路由结果。修改源站配置后，新配置会随 Workers isolate 回收逐步生效。如需立即生效，可重新部署 Worker。

| 前缀 | 源站 |
|---|---|
| `/images/` | `https://images.your-origin.com` |
| `/videos/` | `https://videos.your-origin.com` |

### 3.2 缓存预热

对热点资源执行预热：

```bash
curl -X POST https://cdn.yourdomain.com/admin/warmup \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/images/logo.png","/css/app.css"]}'
```

### 3.3 监控

- Cloudflare Analytics：查看 Workers 请求量、R2 操作、CDN 命中率
- Vercel Analytics：查看前端访问、Web Vitals

---

## 第四阶段：安全加固

1. 修改默认 API Token
2. 限制 Workers 路由仅允许必要域名
3. 启用 Cloudflare WAF 基础规则
4. 为管理后台启用双因素认证
5. 定期轮换密钥
