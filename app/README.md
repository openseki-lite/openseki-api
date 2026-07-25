# Resource Cache Admin

基于 Ark UI `endfield` + `moderate` 风格的资源缓存管理后台。

## 技术栈

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Ark UI 视觉样式

## 页面

- `/` — 总览仪表盘
- `/sources` — 源站路由管理
- `/stats` — 缓存统计

## 本地开发

```bash
cd web/app
# 创建 .env.local 并填入服务端私有变量
npm install
npm run dev
```

## 部署

推荐部署到 Vercel：

```bash
npx vercel --prod
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `CACHE_API_BASE` | 缓存服务地址，如 `https://cdn.yourdomain.com` |
| `CACHE_API_TOKEN` | Workers API Token，仅在 Next.js 服务端配置 |
| `CACHE_WORKER_BASE_URL` | Worker 内部地址，仅由 Next.js 服务端调用 |
| `INTERNAL_PROXY_TOKEN` | Next.js 调用 Worker 的内部 Token |
| `DOWNLOAD_ALLOWED_ORIGINS` | 允许调用下载 API 的网站 Origin，逗号分隔 |
| `ADMIN_PASSWORD` | 管理后台登录密码，仅在 Next.js 服务端配置 |
| `ADMIN_SESSION_SECRET` | 用于签名管理会话的随机长字符串 |

不要使用 `NEXT_PUBLIC_` 前缀保存 Worker Token。管理操作通过 Server Action 在服务端转发。

## Ark UI 契约

- Family: `endfield`
- Depth: `moderate`
- 主屏任务：查看缓存统计、管理源站路由、执行缓存刷新

## CSS 策略

- `app/ark-ui.css` — Ark UI 原生视觉样式（字体、颜色、装饰、组件）
- Tailwind CSS v4 — 用于快速布局
