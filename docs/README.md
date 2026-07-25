# 资源中转缓存系统

一个零服务器成本、国内可访问的资源中转缓存方案，核心依赖 Cloudflare 免费层，前端使用 Nuxt 3 部署在 Vercel。

## 项目目标

- 为国内用户提供可访问的静态资源中转
- 通过多层缓存降低源站压力
- 提供管理后台进行源站配置、缓存预热和统计查看
- 整体成本控制在免费额度内

## 核心架构

```
用户浏览器
    │
    ▼
┌─────────────────┐
│  Cloudflare DNS  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌─────────────┐
│ Vercel │  │ cdn.xxx.com │
│ Nuxt 3 │  │ Cloudflare  │
│ 前端   │  │ Workers + R2 │
└────┬───┘  └──────┬──────┘
     │             │
     │ 管理 API (CORS) │ 回源 / 缓存
     ▼             ▼
┌─────────────────────────┐
│   Cloudflare D1         │
│   元数据、配置、统计       │
└─────────────────────────┘
```

## 文档目录

- [architecture.md](./architecture.md) — 整体架构设计
- [frontend.md](./frontend.md) — 前端方案（Nuxt 3 + Vercel）
- [backend.md](./backend.md) — 后端缓存代理（Cloudflare Workers + R2）
- [api.md](./api.md) — 接口设计
- [deployment.md](./deployment.md) — 部署步骤
- [cost.md](./cost.md) — 成本估算
- [future-user-system.md](./future-user-system.md) — 未来用户系统扩展方案（Supabase）

## 快速开始

1. 阅读 [architecture.md](./architecture.md) 了解整体方案
2. 按 [deployment.md](./deployment.md) 部署 Cloudflare 缓存服务
3. 按 [frontend.md](./frontend.md) 搭建 Nuxt 3 管理后台
4. 参考 [api.md](./api.md) 实现前后端接口
