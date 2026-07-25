# 前端方案

## 技术选型

- **框架**：Nuxt 3
- **部署平台**：Vercel
- **UI 库**：Element Plus 或 Vuetify（Vue 3 组件库）
- **状态管理**：Pinia
- **HTTP 客户端**：原生 fetch 或 $fetch

## 选择 Nuxt 3 的原因

1. 用户熟悉 Vue，学习成本低
2. 全栈能力：前端页面 + Server API 可以在一个项目里
3. Vercel 对 Nuxt 3 支持良好，自动识别并部署
4. 支持 SSR/SSG/CSR 多种渲染模式

## 项目结构

```
web/
├── pages/                    # 前端页面
│   ├── index.vue             # 首页/资源列表
│   ├── admin/
│   │   ├── index.vue         # 管理后台首页
│   │   ├── sources.vue       # 源站配置
│   │   ├── stats.vue         # 缓存统计
│   │   └── purge.vue         # 缓存刷新
│   └── login.vue             # 登录页
├── components/               # 公共组件
│   ├── AppHeader.vue
│   ├── AppSidebar.vue
│   ├── SourceForm.vue
│   └── StatsCard.vue
├── composables/              # 可组合函数
│   ├── useCacheApi.ts        # 直接调用 Workers 管理接口
│   └── useAuth.ts
├── layouts/
│   ├── default.vue
│   └── admin.vue
├── middleware/
│   └── auth.ts
├── stores/
│   └── auth.ts
├── nuxt.config.ts
├── package.json
└── .env.example
```

> 简化：前端直接调用 Workers 管理接口，不再通过 Nuxt Server API 转发。

## 关键页面

### 首页 / 资源列表

- 展示已缓存资源列表
- 支持搜索、分页
- 显示缓存状态（HIT / MISS / R2 HIT）

### 管理后台

- **源站配置**：添加、编辑、删除源站路由
- **缓存刷新**：按路径刷新或全量刷新
- **统计面板**：命中率、流量、存储使用量

## 前端直接调用 Workers

使用一个 composable 封装所有管理接口调用：

```typescript
// composables/useCacheApi.ts
export function useCacheApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.cacheApiBase
  const token = config.public.cacheApiToken

  async function fetchApi(path: string, options: RequestInit = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return response.json()
  }

  return {
    getSources: () => fetchApi('/api/admin/sources'),
    createSource: (data: any) => fetchApi('/api/admin/sources', { method: 'POST', body: JSON.stringify(data) }),
    purgeCache: (prefix: string) => fetchApi('/api/admin/purge', { method: 'POST', body: JSON.stringify({ prefix }) }),
    getStats: (days = 7) => fetchApi(`/api/admin/stats?days=${days}`)
  }
}
```

页面中使用：

```vue
<script setup>
const { getSources } = useCacheApi()
const { data: sources } = await useAsyncData('sources', getSources)
</script>
```

## CORS 配置

Workers 需要允许前端域名访问管理接口：

```javascript
const ALLOWED_ORIGINS = [
  'https://admin.yourdomain.com',
  'http://localhost:3000'
]

function handleCors(request) {
  const origin = request.headers.get('Origin')
  if (!ALLOWED_ORIGINS.includes(origin)) return null

  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  })
}
```

## 环境变量

```bash
# .env
CACHE_API_BASE=https://cdn.yourdomain.com
CACHE_API_TOKEN=your-worker-api-token

# These variables belong on the Next.js server, not in the browser.
NUXT_SESSION_PASSWORD=your-session-secret
```

> `NUXT_PUBLIC_` 前缀表示该变量会暴露给前端，适合 API Base URL。API Token 理论上也会暴露给前端，因此需要配合短期 Token 或 IP 白名单等额外安全措施。如果担心泄露，可以保留少量 Nuxt Server API 做敏感操作转发。

## 部署

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量
4. 绑定自定义域名 `admin.yourdomain.com`

## 注意事项

- Vercel Hobby 版 Serverless Function 最长 10 秒超时
- 免费版带宽 100GB/月
- 如果管理后台主要面向国内用户，考虑部署到 Cloudflare Pages
