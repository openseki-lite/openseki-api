# Resource Cache Worker

Cloudflare Workers + R2 + D1 实现的资源缓存代理服务。

## 功能

- CDN 边缘缓存优先
- R2 持久化缓存
- 多源站路由（D1 存储）
- Range 请求支持
- ETag / If-None-Match 支持
- 并发回源合并
- 管理 API（源站、刷新、预热）
- 仅允许带内部 Token 的 Next.js 下载代理访问资源
- R2 使用量达到 9 GiB 后停止写入新对象

## 目录结构

```
web/worker/
├── src/
│   └── index.js          # Worker 入口
├── schema.sql            # D1 初始化脚本
├── wrangler.toml         # Wrangler 配置
├── package.json
└── README.md
```

## 本地开发

```bash
cd web/worker
npm install
cp wrangler.toml wrangler.toml.local
# 编辑 wrangler.toml.local 填入你的 D1 database_id、R2 bucket_name、域名
npx wrangler dev
```

## 部署

### 手动部署

```bash
npx wrangler deploy
```

### GitHub Actions 自动部署

已在 `web/.github/workflows/deploy-worker.yml` 配置自动部署工作流。

需要配置：

1. 在 Cloudflare Dashboard 创建 API Token：
   - 权限：`Cloudflare Workers:Edit`、`Account:Read`
   - 资源：你的账户

2. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：

   **Secret（加密）：**
   - `CLOUDFLARE_API_TOKEN`

   **Variables（明文配置）：**
   - `ORIGIN_ALLOWLIST`：允许配置的源站 Origin，逗号分隔（必填）
   - `D1_DATABASE_NAME`：D1 数据库名，默认 `resource-cache-db`，CI 会自动解析 ID
   - `R2_BUCKET_NAME`：R2 bucket 名，默认 `resource-cache`
   - `ROUTE_PATTERN`：Worker 路由（可选），自定义域名填 `cdn.yourdomain.com`，留空则只使用 `*.workers.dev`
   - `DEFAULT_TTL`：默认 `604800`
   - `MAX_CACHE_SIZE`：默认 `104857600`
   - `R2_MAX_STORAGE_BYTES`：默认 `9663676416`
   - `ADMIN_ORIGINS`：允许管理 API 跨域调用的前端 Origin，按需配置

   > 首次部署前，需要先在 Cloudflare Dashboard 注册一个免费的 `workers.dev` 子域名，否则部署会失败。

3. push 到 `main` 分支自动触发部署

## 初始化 D1 数据库

```bash
npx wrangler d1 create resource-cache-db
# 把返回的 database_id 填入 wrangler.toml
npx wrangler d1 execute resource-cache-db --file=./schema.sql
npx wrangler d1 migrations apply resource-cache-db --remote
```

## 设置 API Token

```bash
npx wrangler secret put API_TOKEN
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `API_TOKEN` | 管理 API 认证 Token（Secret） |
| `DEFAULT_TTL` | 默认缓存时间，单位秒 |
| `MAX_CACHE_SIZE` | 最大缓存文件大小，单位字节 |
| `R2_MAX_STORAGE_BYTES` | R2 最大缓存总量，默认 9663676416（9 GiB） |
| `ORIGIN_ALLOWLIST` | 允许写入 D1 的源站 Origin 白名单 |
| `ADMIN_ORIGINS` | 管理 API 的 CORS Origin 白名单 |

## 管理 API

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/admin/sources` | GET | 获取源站列表 |
| `/api/admin/sources` | POST | 新增/更新源站 |
| `/api/admin/purge` | POST | 刷新缓存 |
| `/api/admin/warm` | POST | 预热缓存 |

请求头需要带：`Authorization: Bearer <API_TOKEN>`
