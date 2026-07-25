-- D1 数据库初始化脚本
-- 运行方式：npx wrangler d1 execute resource-cache-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS source_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefix TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  ttl INTEGER DEFAULT 604800,
  active INTEGER DEFAULT 1,
  team_id TEXT DEFAULT 'default',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_routes_active ON source_routes(active);
CREATE INDEX IF NOT EXISTS idx_source_routes_team ON source_routes(team_id);

-- 插入示例数据
INSERT OR IGNORE INTO source_routes (prefix, origin, ttl, active)
VALUES
  ('/images/*', 'https://origin-a.com', 604800, 1),
  ('/assets/*', 'https://origin-b.com', 604800, 1),
  ('/docs/*', 'https://docs.example.com', 86400, 1);

CREATE TABLE IF NOT EXISTS cache_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  requests INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  bytes_served INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
