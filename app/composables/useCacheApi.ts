export const useCacheApi = () => {
  const config = useRuntimeConfig()
  const base = config.public.cacheApiBase
  const token = config.public.cacheApiToken

  async function request(path: string, options: RequestInit = {}) {
    const url = `${base}${path}`
    const headers = new Headers(options.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }

  async function purge(prefix: string) {
    try {
      const res = await request('/api/admin/purge', {
        method: 'POST',
        body: JSON.stringify({ prefix })
      })
      if (!res.ok) throw new Error('Purge failed')
      alert(`已刷新 ${prefix}`)
    } catch (e) {
      console.error(e)
      alert('刷新失败，请检查 API 配置')
    }
  }

  async function purgeAll() {
    await purge('/*')
  }

  async function warm(prefix: string) {
    return request('/api/admin/warm', {
      method: 'POST',
      body: JSON.stringify({ prefix })
    })
  }

  return { request, purge, purgeAll, warm }
}
