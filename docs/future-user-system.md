# 未来用户系统方案（Supabase）

> 当前阶段不需要引入 Supabase。本文档用于规划未来需要用户系统时的扩展方案。

## 引入时机

当以下任一需求出现时，考虑引入 Supabase：

- 需要多管理员账号和 OAuth 登录
- 需要多租户（不同团队管理不同源站）
- 需要审计日志（记录谁修改了什么配置）
- 需要复杂的权限控制（角色、只读账号等）
- D1 无法满足用户相关的查询需求

## 引入后的架构变化

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
     │             │ 回源 / 缓存
     │             ▼
     │      ┌─────────────┐
     │      │   源站服务器  │
     │      └─────────────┘
     │
     ▼
┌─────────────────────────┐
│        Supabase          │
│  - Auth（用户认证）        │
│  - PostgreSQL（用户数据）  │
│  - Row Level Security     │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Cloudflare D1          │
│   源站配置、缓存统计        │
└─────────────────────────┘
```

## 职责划分

| 数据 | 存储位置 | 原因 |
|---|---|---|
| 用户账号、OAuth、角色 | Supabase Auth | 成熟的认证系统 |
| 用户团队/组织信息 | Supabase PostgreSQL | 关系型数据 |
| 源站路由配置 | D1 | 读取频繁，靠近 Worker |
| 缓存统计 | D1 | 按天聚合，简单查询 |
| 审计日志 | Supabase PostgreSQL | 需要复杂查询和关联用户 |

## 数据模型扩展

### Supabase 用户表

使用 Supabase Auth 自带 `auth.users` 表，无需自建。

### 用户资料表

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'member', -- superadmin, admin, member
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 团队/组织表

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'member', -- owner, admin, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
```

### D1 配置表扩展

在 D1 的 `source_routes` 表增加 `team_id`，实现多租户：

```sql
ALTER TABLE source_routes ADD COLUMN team_id TEXT DEFAULT 'default';
```

## 认证流程

```
用户点击登录
    │
    ▼
Nuxt 3 调用 Supabase Auth
    │
    ▼
跳转到 GitHub/Google OAuth
    │
    ▼
回调到 Nuxt 3，获取 JWT
    │
    ▼
前端请求 Workers 时携带 JWT
    │
    ▼
Workers 验证 JWT（Supabase 公钥）
    │
    ▼
根据用户角色决定是否允许操作
```

## Workers 验证 JWT

```javascript
async function verifySupabaseToken(token, env) {
  const [header, payload, signature] = token.split('.')
  const decodedPayload = JSON.parse(atob(payload))

  // 检查过期时间
  if (decodedPayload.exp < Date.now() / 1000) {
    return null
  }

  // 用 Supabase JWT Secret 验证签名（简化示例）
  // 生产环境建议使用 jose 等库
  return decodedPayload
}
```

## Nuxt 3 集成 Supabase

```bash
npm install @nuxtjs/supabase
```

`nuxt.config.ts`：

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase'],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false
  }
})
```

页面中使用：

```vue
<script setup>
const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function signInWithGitHub() {
  await supabase.auth.signInWithOAuth({ provider: 'github' })
}
</script>
```

## 成本估算

| 项目 | 免费额度 | 超出费用 |
|---|---|---|
| Supabase Auth | 50000 月活用户 | $25/月起 |
| Supabase DB | 500MB | $25/月起 |
| Supabase 带宽 | 2GB/月 | $0.09/GB |

对于小型管理后台，免费版够用很久。

## 迁移步骤

1. 创建 Supabase 项目
2. 在 Nuxt 3 中接入 `@nuxtjs/supabase`
3. 在 Supabase 中创建 `profiles`、`teams`、`team_members` 表
4. 在 D1 的 `source_routes` 增加 `team_id` 字段
5. Workers 增加 JWT 验证逻辑
6. 前端登录后调用 Workers 时携带 Supabase JWT
7. 逐步将审计日志从 D1 迁移到 Supabase

## 注意事项

- Supabase 对国内访问速度一般，管理后台主要给管理员用，影响较小
- 不要把 Supabase 用于高频资源代理请求，只用于管理操作
- Workers 验证 JWT 时需要处理 Supabase JWT Secret 轮换
- 建议保留 D1 作为源站配置的权威存储，Supabase 只负责用户相关数据
