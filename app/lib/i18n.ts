export const locales = ['zh-CN', 'en-US'] as const;

export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = 'opensekai_locale';

export function parseLocale(value: string | null | undefined): Locale {
  return value === 'en-US' ? 'en-US' : 'zh-CN';
}

export const messages = {
  'zh-CN': {
    nav: { overview: '概览', sources: '源站', stats: '统计' },
    shell: { status: '服务在线', menu: '菜单', navigation: '主导航', switchLanguage: '切换至 English' },
    dashboard: {
      kicker: '控制台', title: '缓存中继', requests: '请求 / 今日', hitRatio: '命中 / 比率', bytesServed: '流量 / 今日',
      requestsDescription: '今日已处理的总请求数。', hitRatioDescription: 'CDN 与 R2 的缓存命中率。', bytesDescription: '今日从缓存提供的数据量。',
      purgeCode: '操作 / 清除', purgeTitle: '清除缓存', purgeDescription: '从 R2 与边缘缓存中移除已缓存对象。', purgeButton: '清除全部',
      warmCode: '操作 / 预热', warmTitle: '预热缓存', warmDescription: '将关键资源重新加载至缓存。', warmButton: '开始预热',
    },
    sources: {
      kicker: '源站路由', title: '路由表', allowlistCode: '安全 / 白名单', allowlistTitle: '允许的源站',
      allowlistDescription: '每行一个源站 Origin。保存后立即覆盖 Worker 环境变量 ORIGIN_ALLOWLIST。',
      allowlistPlaceholder: 'https://viewer.unipjsk.com', saveAllowlist: '保存白名单', resetAllowlist: '恢复环境变量配置',
      dynamicAllowlist: '当前使用动态配置', environmentAllowlist: '当前使用环境变量配置',
      routeCode: '添加 / 路由', routeTitle: '新增源站', prefix: '路径前缀', origin: '源站 Origin', ttl: '缓存时间', addRoute: '添加路由',
      status: '状态', active: '启用', inactive: '停用', noRoutes: '尚未配置路由。',
    },
    stats: { kicker: '缓存统计', title: '指标', hits: '命中', misses: '未命中', hitRatio: '命中率', noStats: '暂无统计数据。' },
    login: { kicker: '访问控制', title: '管理员登录', panelCode: '会话 / 私有', panelTitle: 'OpenSekai 缓存中继', password: '密码', missingConfig: '请先在服务端配置 ADMIN_PASSWORD 与 ADMIN_SESSION_SECRET。', invalidPassword: '密码错误。', signIn: '登录' },
  },
  'en-US': {
    nav: { overview: 'Overview', sources: 'Sources', stats: 'Stats' },
    shell: { status: 'RELAY ONLINE', menu: 'Menu', navigation: 'Primary navigation', switchLanguage: 'Switch to Chinese' },
    dashboard: {
      kicker: 'DASHBOARD', title: 'CACHE RELAY', requests: 'REQ / TODAY', hitRatio: 'HIT / RATIO', bytesServed: 'BYTES / SERVED',
      requestsDescription: 'Total requests served today.', hitRatioDescription: 'Cache hit ratio across CDN and R2.', bytesDescription: 'Data served from cache today.',
      purgeCode: 'ACTION / PURGE', purgeTitle: 'Clear Cache', purgeDescription: 'Remove cached objects from R2 and edge cache.', purgeButton: 'Purge All',
      warmCode: 'ACTION / WARM', warmTitle: 'Preload Cache', warmDescription: 'Fetch critical resources back into cache.', warmButton: 'Warm Up',
    },
    sources: {
      kicker: 'SOURCE ROUTES', title: 'ROUTING TABLE', allowlistCode: 'SECURITY / ALLOWLIST', allowlistTitle: 'Allowed Origins',
      allowlistDescription: 'One source Origin per line. Saving immediately overrides the Worker ORIGIN_ALLOWLIST environment variable.',
      allowlistPlaceholder: 'https://viewer.unipjsk.com', saveAllowlist: 'Save Allowlist', resetAllowlist: 'Use Environment Default',
      dynamicAllowlist: 'Using dynamic configuration', environmentAllowlist: 'Using environment configuration',
      routeCode: 'ADD / ROUTE', routeTitle: 'New Source', prefix: 'Prefix', origin: 'Origin', ttl: 'TTL', addRoute: 'Add Route',
      status: 'Status', active: 'Active', inactive: 'Inactive', noRoutes: 'No routes configured.',
    },
    stats: { kicker: 'CACHE STATISTICS', title: 'METRICS', hits: 'Hits', misses: 'Misses', hitRatio: 'Hit Ratio', noStats: 'No statistics available yet.' },
    login: { kicker: 'ACCESS CONTROL', title: 'ADMIN LOGIN', panelCode: 'SESSION / PRIVATE', panelTitle: 'OpenSekai Cache Relay', password: 'Password', missingConfig: 'Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server first.', invalidPassword: 'Invalid password.', signIn: 'Sign In' },
  },
} as const;

export function getMessages(locale: Locale) {
  return messages[locale];
}
