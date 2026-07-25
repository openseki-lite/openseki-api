# Resource Cache Admin

基于 Ark UI `endfield` + `moderate` 风格的资源缓存管理后台。

## 技术栈

- Nuxt 3
- Vue 3 Composition API
- 原生 CSS（Ark UI tokens）

## 页面

- `/` — 总览仪表盘
- `/sources` — 源站路由管理
- `/stats` — 缓存统计

## 本地开发

```bash
cd web/app
cp .env.example .env
# 编辑 .env 填入 CACHE_API_BASE 和 TOKEN
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
| `NUXT_PUBLIC_CACHE_API_BASE` | 缓存服务地址，如 `https://cdn.yourdomain.com` |
| `NUXT_PUBLIC_CACHE_API_TOKEN` | Workers API Token |

## Ark UI 契约

- Family: `endfield`
- Depth: `moderate`
- 主屏任务：查看缓存统计、管理源站路由、执行缓存刷新

## CSS 策略

- `assets/css/ark-ui.css` — Ark UI 原生视觉样式（字体、颜色、装饰、组件）
- `assets/css/tailwind.css` — Tailwind 工具类，用于快速布局
- `tailwind.config.js` 中 `preflight: false`，避免覆盖 ark-ui 基础样式
