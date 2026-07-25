# 后端缓存代理

## 技术选型

- **运行环境**：Cloudflare Workers
- **持久化缓存**：Cloudflare R2
- **边缘缓存**：Cloudflare CDN（Cache API）
- **元数据存储**：Cloudflare D1

> 简化：初期只用 D1，不使用 KV。等 D1 读性能成为瓶颈时，再把高频只读配置迁移到 KV。

## Worker 核心逻辑

```javascript
// 同一 isolate 内的内存缓存，用于路由缓存和并发回源合并
const routeCache = new Map()
const inFlight = new Map()

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // 管理接口单独处理
    if (url.pathname.startsWith('/admin')) {
      return handleAdmin(request, env)
    }

    // 资源代理只接受 GET/HEAD
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 })
    }

    return handleResource(request, env, ctx)
  }
}

async function handleResource(request, env, ctx) {
  const url = new URL(request.url)
  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default

  // 1. 尝试 CDN 边缘缓存
  let response = await cache.match(cacheKey)
  if (response) return response

  // 2. 获取源站（带内存路由缓存）
  const originBase = await getOriginBase(url.pathname, env)

  // 3. 尝试 R2 持久缓存
  const r2Key = `cache${url.pathname}`
  const rangeHeader = request.headers.get('Range')
  const r2Options = rangeHeader ? { range: parseRange(rangeHeader) } : undefined

  const r2Object = await env.CACHE_BUCKET.get(r2Key, r2Options)
  if (r2Object) {
    // If-None-Match 304
    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch && ifNoneMatch === r2Object.httpEtag) {
      return new Response(null, { status: 304 })
    }

    response = buildR2Response(r2Object, rangeHeader)
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  }

  // 4. 并发请求合并，避免同一资源多次回源
  const fetchKey = `${originBase}${url.pathname}${url.search}`
  if (!inFlight.has(fetchKey)) {
    const promise = fetchFromOrigin(request, originBase)
      .finally(() => inFlight.delete(fetchKey))
    inFlight.set(fetchKey, promise)
  }
  const originResponse = await inFlight.get(fetchKey)

  if (!originResponse.ok) {
    return new Response('Origin Error', { status: 502 })
  }

  // 5. 写入 R2 和 CDN
  ctx.waitUntil(storeAndCache(request, env, ctx, r2Key, originResponse.clone(), cacheKey))

  return buildOriginResponse(originResponse)
}

async function getOriginBase(pathname, env) {
  // 同一 isolate 内缓存路由结果
  if (routeCache.has(pathname)) {
    return routeCache.get(pathname)
  }

  const routes = await env.DB.prepare(
    'SELECT prefix, origin FROM source_routes ORDER BY LENGTH(prefix) DESC'
  ).all()

  for (const route of routes.results) {
    if (pathname.startsWith(route.prefix)) {
      routeCache.set(pathname, route.origin)
      return route.origin
    }
  }

  routeCache.set(pathname, env.DEFAULT_ORIGIN)
  return env.DEFAULT_ORIGIN
}

function parseRange(rangeHeader) {
  if (!rangeHeader) return undefined

  // bytes=start-end
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  if (match) {
    const offset = parseInt(match[1])
    const end = match[2] ? parseInt(match[2]) : undefined
    const length = end ? end - offset + 1 : undefined
    return length ? { offset, length } : { offset }
  }

  // bytes=-suffix
  const suffixMatch = rangeHeader.match(/bytes=-(\d+)/)
  if (suffixMatch) {
    return { suffix: parseInt(suffixMatch[1]) }
  }

  return undefined
}

async function fetchFromOrigin(request, originBase) {
  const url = new URL(request.url)
  const originUrl = `${originBase}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(originBase).host)
  headers.delete('Accept-Encoding') // 让源站返回原始内容，Worker 自行处理

  return fetch(originUrl, {
    method: request.method,
    headers
  })
}

function buildR2Response(r2Object, rangeHeader) {
  const headers = new Headers()
  r2Object.writeHttpMetadata(headers)
  headers.set('CF-Cache-Status', 'HIT-R2')
  headers.set('ETag', r2Object.httpEtag)

  if (rangeHeader) {
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Content-Range', r2Object.range)
  }

  return new Response(r2Object.body, { status: rangeHeader ? 206 : 200, headers })
}

async function storeAndCache(request, env, ctx, r2Key, originResponse, cacheKey) {
  const cache = caches.default
  const contentType = originResponse.headers.get('content-type')
  const cacheControl = originResponse.headers.get('Cache-Control') || `public, max-age=${env.CACHE_TTL || 604800}`

  await env.CACHE_BUCKET.put(r2Key, await originResponse.blob(), {
    httpMetadata: {
      contentType,
      cacheControl
    }
  })

  // 重新读取 R2 构造可缓存响应
  const r2Object = await env.CACHE_BUCKET.get(r2Key)
  const response = buildR2Response(r2Object, null)
  response.headers.set('Cache-Control', cacheControl)
  await cache.put(cacheKey, response)
}

function buildOriginResponse(originResponse) {
  const headers = new Headers(originResponse.headers)
  headers.set('CF-Cache-Status', 'MISS')
  return new Response(originResponse.body, {
    status: originResponse.status,
    headers
  })
}
```

## 管理接口

Worker 除了代理请求，还暴露管理接口：

| 接口 | 方法 | 作用 |
|---|---|---|
| `/admin/sources` | GET | 获取源站配置 |
| `/admin/sources` | POST | 新增/更新源站配置 |
| `/admin/purge` | POST | 刷新指定路径缓存 |
| `/admin/stats` | GET | 获取缓存统计 |

这些接口需要 Bearer Token 认证。

## R2 存储设计

```
cache/
├── images/
│   └── abc.jpg
├── videos/
│   └── def.mp4
└── assets/
    └── app.js
```

R2 key 规则：`cache/{pathname}`

## D1 表结构

```sql
-- 源站路由配置
CREATE TABLE source_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefix TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 统计汇总（按天更新，不记录单条请求）
CREATE TABLE cache_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  total_requests INTEGER DEFAULT 0,
  hit_cdn INTEGER DEFAULT 0,
  hit_r2 INTEGER DEFAULT 0,
  miss INTEGER DEFAULT 0,
  bytes_served INTEGER DEFAULT 0
);
```

> 注意：不记录单条访问日志，避免 D1 写入额度耗尽。统计信息通过每日聚合或 Cloudflare Analytics 获取。

## 缓存控制

### TTL 设置

优先尊重源站 `Cache-Control`，否则使用默认 7 天：

```javascript
const cacheControl = originResponse.headers.get('Cache-Control') || `public, max-age=${env.CACHE_TTL || 604800}`
```

### 缓存刷新

```javascript
async function purgeCache(path, env, ctx) {
  const url = new URL(`https://cdn.yourdomain.com${path}`)
  const cacheKey = new Request(url.toString())
  await caches.default.delete(cacheKey)
  await env.CACHE_BUCKET.delete(`cache${path}`)
}
```

## 安全

1. **管理接口认证**：Bearer Token（用 `wrangler secret put API_TOKEN`）
2. **防盗链**：Referer 白名单（可选）
3. **请求方法限制**：仅允许 GET/HEAD 访问资源
4. **路径规范化**：防止 `../` 等路径穿越
5. **并发回源合并**：避免同一资源被多次回源拉取

## 部署

使用 Wrangler CLI：

```bash
npx wrangler deploy
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

> API_TOKEN 通过 `wrangler secret put API_TOKEN` 设置，不要硬编码在 `wrangler.toml` 中。
