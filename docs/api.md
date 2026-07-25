# 接口设计

## 接口总览

所有管理接口部署在 Cloudflare Workers 上，前端直接调用（CORS + Bearer Token）。

## 认证方式

管理接口使用 Bearer Token 认证：

```http
Authorization: Bearer {API_TOKEN}
```

## 公共响应格式

成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 资源代理接口

### 获取资源

```http
GET https://cdn.yourdomain.com/{path}
```

**请求头：**

- `Range`: 可选，用于断点续传

**响应头：**

- `CF-Cache-Status`: `HIT` / `HIT-R2` / `MISS`
- `Cache-Control`: 缓存策略
- `Content-Type`: 资源类型
- `ETag`: 资源标识

## 管理接口

### 获取源站配置列表

```http
GET /admin/sources
Authorization: Bearer {token}
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "prefix": "/images/",
      "origin": "https://images-origin.com",
      "created_at": "2026-07-25T00:00:00Z",
      "updated_at": "2026-07-25T00:00:00Z"
    }
  ]
}
```

### 新增源站配置

```http
POST /admin/sources
Authorization: Bearer {token}
Content-Type: application/json

{
  "prefix": "/images/",
  "origin": "https://images-origin.com"
}
```

### 更新源站配置

```http
PUT /admin/sources/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "prefix": "/images/",
  "origin": "https://new-origin.com"
}
```

### 删除源站配置

```http
DELETE /admin/sources/{id}
Authorization: Bearer {token}
```

### 刷新缓存

```http
POST /admin/purge
Authorization: Bearer {token}
Content-Type: application/json

{
  "path": "/images/abc.jpg"
}
```

或刷新整个前缀：

```json
{
  "prefix": "/images/"
}
```

### 获取缓存统计

```http
GET /admin/stats?days=7
Authorization: Bearer {token}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "total_requests": 100000,
    "hit_cdn": 75000,
    "hit_r2": 15000,
    "miss": 10000,
    "hit_rate": 0.9,
    "bytes_served": 10737418240,
    "storage_used": 5368709120
  }
}
```

### 缓存预热

```http
POST /admin/warmup
Authorization: Bearer {token}
Content-Type: application/json

{
  "paths": [
    "/images/abc.jpg",
    "/videos/def.mp4"
  ]
}
```

## CORS 支持

Workers 管理接口需要返回正确的 CORS 头，前端才能直接调用：

```javascript
function handleAdmin(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  // 校验 Token
  const auth = request.headers.get('Authorization')
  if (!auth || auth !== `Bearer ${env.API_TOKEN}`) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
  }

  // 处理具体接口...
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin')
  const allowed = ['https://admin.yourdomain.com', 'http://localhost:3000']
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  }
}
```

## 可选：Nuxt Server API 转发

如果你不想把 API Token 暴露给前端，可以保留少量 Nuxt Server API 做敏感操作转发：

```typescript
// server/api/admin/sources.get.ts
export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const config = useRuntimeConfig()
  const response = await fetch(`${config.cacheApiBase}/admin/sources`, {
    headers: { Authorization: `Bearer ${config.cacheApiToken}` }
  })

  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: 'Failed to fetch sources' })
  }

  return response.json()
})
```

## 错误码

| 状态码 | 含义 |
|---|---|
| 200 | 成功 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 502 | 源站错误 |
| 500 | 服务器内部错误 |
