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

已在项目根目录创建 `.github/workflows/deploy-worker.yml`。

需要配置：

1. 在 Cloudflare Dashboard 创建 API Token：
   - 权限：`Cloudflare Workers:Edit`、`Account:Read`
   - 资源：你的账户

2. 在 GitHub 仓库 Settings → Secrets → Actions 添加：
   - `CLOUDFLARE_API_TOKEN`

3. push 到 `main` 分支自动触发部署

## 初始化 D1 数据库

```bash
npx wrangler d1 create resource-cache-db
# 把返回的 database_id 填入 wrangler.toml
npx wrangler d1 execute resource-cache-db --file=./schema.sql
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

## 管理 API

| 接口 | 方法 | 说明 |
|---|---|---|
| `/api/admin/sources` | GET | 获取源站列表 |
| `/api/admin/sources` | POST | 新增/更新源站 |
| `/api/admin/purge` | POST | 刷新缓存 |
| `/api/admin/warm` | POST | 预热缓存 |

请求头需要带：`Authorization: Bearer <API_TOKEN>`
