const DEFAULT_TTL = 7 * 24 * 60 * 60 // 7 days
const MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB
const R2_PREFIX = 'cache/'

// In-flight request deduplication (per-isolate)
const inFlight = new Map()
const routeCache = new Map()

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Admin API routes
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdmin(request, env, url)
    }

    // Only cache GET/HEAD
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const cacheKey = buildCacheKey(request, url)
    const cache = caches.default

    // 1. CDN edge cache
    let response = await cache.match(cacheKey)
    if (response) return response

    // 2. Resolve source route
    const route = await resolveRoute(url.pathname, env)
    if (!route) {
      return new Response('No route configured', { status: 404 })
    }

    const r2Key = `${R2_PREFIX}${route.teamId || 'default'}${normalizePath(url.pathname)}`

    // 3. R2 cache
    const r2Object = await getR2Object(env, r2Key, request.headers.get('Range'))
    if (r2Object) {
      response = buildR2Response(r2Object, request)
      ctx.waitUntil(cache.put(cacheKey, response.clone()))
      return response
    }

    // 4. Fetch from origin with coalescing
    const originUrl = `${route.origin}${url.pathname}${url.search}`
    const originResponse = await fetchWithCoalescing(originUrl, () => fetchOrigin(request, originUrl))

    if (!originResponse.ok) {
      return new Response('Origin Error', { status: 502 })
    }

    // 5. Stream response and cache asynchronously
    const cloned = originResponse.clone()
    const headers = new Headers(originResponse.headers)
    headers.set('CF-Cache-Status', 'MISS')
    headers.set('Cache-Control', headers.get('Cache-Control') || `public, max-age=${DEFAULT_TTL}`)

    response = new Response(originResponse.body, {
      status: originResponse.status,
      headers
    })

    ctx.waitUntil(
      (async () => {
        const contentLength = parseInt(cloned.headers.get('Content-Length') || '0')
        if (contentLength && contentLength > MAX_CACHE_SIZE) return

        try {
          await env.CACHE_BUCKET.put(r2Key, await cloned.blob(), {
            httpMetadata: {
              contentType: cloned.headers.get('content-type'),
              cacheControl: headers.get('Cache-Control')
            }
          })
          await cache.put(cacheKey, response.clone())
        } catch (e) {
          console.error('Cache write error:', e)
        }
      })()
    )

    return response
  }
}

function buildCacheKey(request, url) {
  const cacheUrl = new URL(url.toString())
  cacheUrl.search = ''
  return new Request(cacheUrl.toString(), request)
}

function normalizePath(pathname) {
  return pathname.normalize('NFC').replace(/\.{2,}/g, '')
}

async function resolveRoute(pathname, env) {
  if (routeCache.has(pathname)) return routeCache.get(pathname)

  // Find longest matching prefix from D1
  const { results } = await env.DB.prepare(`
    SELECT prefix, origin, team_id as teamId
    FROM source_routes
    WHERE active = 1
    ORDER BY length(prefix) DESC
  `).all()

  for (const row of results || []) {
    if (pathname.startsWith(row.prefix.replace(/\*$/, ''))) {
      routeCache.set(pathname, row)
      return row
    }
  }

  return null
}

async function getR2Object(env, key, rangeHeader) {
  const options = {}
  if (rangeHeader) {
    const parsed = parseRange(rangeHeader)
    if (parsed) options.range = parsed
  }

  try {
    return await env.CACHE_BUCKET.get(key, options)
  } catch (e) {
    console.error('R2 read error:', e)
    return null
  }
}

function buildR2Response(r2Object, request) {
  const headers = new Headers()
  r2Object.writeHttpMetadata(headers)
  headers.set('CF-Cache-Status', 'HIT-R2')
  headers.set('Accept-Ranges', 'bytes')
  if (r2Object.httpEtag) headers.set('ETag', r2Object.httpEtag)

  const ifNoneMatch = request.headers.get('If-None-Match')
  if (ifNoneMatch && ifNoneMatch === r2Object.httpEtag) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(r2Object.body, { headers })
}

async function fetchWithCoalescing(key, fetcher) {
  if (inFlight.has(key)) return inFlight.get(key)
  const promise = fetcher().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

async function fetchOrigin(request, originUrl) {
  return fetch(originUrl, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      Host: new URL(originUrl).host
    }
  })
}

function parseRange(rangeHeader) {
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)
  if (!match) return null

  const start = match[1] ? parseInt(match[1]) : undefined
  const end = match[2] ? parseInt(match[2]) : undefined

  if (start !== undefined && end !== undefined) {
    return { offset: start, length: end - start + 1 }
  }
  if (start !== undefined) {
    return { offset: start }
  }
  if (end !== undefined) {
    return { suffix: end }
  }
  return null
}

async function handleAdmin(request, env, url) {
  // Verify token
  const auth = request.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (token !== env.API_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (url.pathname === '/api/admin/purge' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    const prefix = body.prefix || '/*'
    return purgeCache(env, prefix)
  }

  if (url.pathname === '/api/admin/warm' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    return warmCache(env, body.prefix)
  }

  if (url.pathname === '/api/admin/sources' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM source_routes').all()
    return jsonResponse(results)
  }

  if (url.pathname === '/api/admin/sources' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    await env.DB.prepare(`
      INSERT INTO source_routes (prefix, origin, ttl, active, team_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(prefix) DO UPDATE SET
        origin = excluded.origin,
        ttl = excluded.ttl,
        active = excluded.active,
        updated_at = datetime('now')
    `).bind(body.prefix, body.origin, body.ttl || DEFAULT_TTL, body.active ? 1 : 0, body.teamId || 'default').run()
    return jsonResponse({ ok: true })
  }

  return new Response('Not Found', { status: 404 })
}

async function purgeCache(env, prefix) {
  // List and delete matching R2 objects
  const list = await env.CACHE_BUCKET.list({ prefix: `${R2_PREFIX}${prefix.replace(/^\//, '').replace(/\*$/, '')}` })
  for (const obj of list.objects || []) {
    await env.CACHE_BUCKET.delete(obj.key)
  }
  return jsonResponse({ purged: list.objects?.length || 0 })
}

async function warmCache(env, prefix) {
  // TODO: implement warm logic based on your resource catalog
  return jsonResponse({ warmed: 0 })
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
