const DEFAULT_TTL = 7 * 24 * 60 * 60
const MAX_CACHE_SIZE = 100 * 1024 * 1024
const R2_PREFIX = 'cache/'
const DEFAULT_CACHE_VERSION = 1
const inFlight = new Map()

// The version is part of the edge key, so a purge invalidates every isolate.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/admin/')) {
      try {
        return withCors(await handleAdmin(request, env, url), request, env)
      } catch (error) {
        console.error('Admin API error:', error)
        return withCors(jsonResponse({ error: 'Internal Server Error' }, 500), request, env)
      }
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const rangeHeader = request.headers.get('Range')
    const cacheVersion = await getCacheVersion(env)
    const cacheKey = buildCacheKey(url, cacheVersion)
    const canUseEdgeCache = !rangeHeader
    const cache = caches.default

    if (canUseEdgeCache) {
      const cachedResponse = await cache.match(cacheKey)
      if (cachedResponse) {
        track(ctx, env, 'hit', responseBytes(cachedResponse))
        return cachedResponse
      }
    }

    const route = await resolveRoute(url.pathname, env)
    if (!route) {
      track(ctx, env, 'miss', 0)
      return new Response('No route configured', { status: 404 })
    }

    const r2Key = buildR2Key(route.teamId, url)
    const r2Object = await getR2Object(env, r2Key, rangeHeader)
    if (r2Object) {
      const response = buildR2Response(r2Object, request)
      track(ctx, env, 'hit', responseBytes(response))
      if (canUseEdgeCache && request.method === 'GET') {
        ctx.waitUntil(cache.put(cacheKey, response.clone()))
      }
      return response
    }

    const originUrl = `${route.origin}${url.pathname}${url.search}`
    const coalescingKey = `${request.method}:${originUrl}:${rangeHeader || ''}`
    const originResponse = await fetchWithCoalescing(
      coalescingKey,
      () => fetchOrigin(request, originUrl),
    )

    if (!originResponse.ok) {
      track(ctx, env, 'miss', responseBytes(originResponse))
      return responseForCaller(originResponse, request)
    }

    const callerResponse = originResponse.clone()
    const headers = new Headers(originResponse.headers)
    headers.set('CF-Cache-Status', 'MISS')
    headers.set(
      'Cache-Control',
      headers.get('Cache-Control') || `public, max-age=${route.ttl ?? env.DEFAULT_TTL ?? DEFAULT_TTL}`,
    )

    const response = new Response(request.method === 'HEAD' ? null : callerResponse.body, {
      status: originResponse.status,
      headers,
    })
    track(ctx, env, 'miss', responseBytes(response))

    if (request.method === 'GET' && canStoreResponse(originResponse, headers)) {
      ctx.waitUntil(storeResponse(env, cache, r2Key, cacheKey, originResponse, headers))
    }

    return response
  },
}

function buildCacheKey(url, version) {
  const cacheUrl = new URL(url.toString())
  cacheUrl.searchParams.set('__cache_version', String(version))
  return new Request(cacheUrl.toString(), { method: 'GET' })
}

function buildR2Key(teamId, url) {
  const safeTeamId = sanitizeKeySegment(teamId || 'default')
  return `${R2_PREFIX}${safeTeamId}${normalizePath(url.pathname)}${url.search}`
}

function normalizePath(pathname) {
  return pathname.normalize('NFC').replace(/\.{2,}/g, '')
}

async function resolveRoute(pathname, env) {
  const { results } = await env.DB.prepare(`
    SELECT prefix, origin, ttl, team_id as teamId
    FROM source_routes
    WHERE active = 1
    ORDER BY length(prefix) DESC
  `).all()

  for (const row of results || []) {
    const routePrefix = row.prefix.replace(/\*$/, '')
    const exactPrefix = routePrefix.replace(/\/$/, '') || '/'
    if (pathname === exactPrefix || pathname.startsWith(routePrefix)) {
      return row
    }
  }

  return null
}

async function getR2Object(env, key, rangeHeader) {
  const options = {}
  if (rangeHeader) {
    const parsed = parseRange(rangeHeader)
    if (!parsed) return null
    options.range = parsed
  }

  try {
    return await env.CACHE_BUCKET.get(key, options)
  } catch (error) {
    console.error('R2 read error:', error)
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

  let status = 200
  if (r2Object.range) {
    const { offset, length } = r2Object.range
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${r2Object.size}`)
    headers.set('Content-Length', String(length))
    status = 206
  }

  return new Response(request.method === 'HEAD' ? null : r2Object.body, { status, headers })
}

async function fetchWithCoalescing(key, fetcher) {
  if (inFlight.has(key)) return inFlight.get(key)
  const promise = fetcher().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

async function fetchOrigin(request, originUrl) {
  const headers = new Headers()
  for (const name of ['Range', 'If-None-Match', 'If-Modified-Since']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('Host', new URL(originUrl).host)

  return fetch(originUrl, {
    method: request.method,
    headers,
  })
}

function parseRange(rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!match || (!match[1] && !match[2])) return null

  const start = match[1] ? Number(match[1]) : undefined
  const end = match[2] ? Number(match[2]) : undefined
  if (start !== undefined && end !== undefined && end < start) return null

  if (start !== undefined && end !== undefined) {
    return { offset: start, length: end - start + 1 }
  }
  if (start !== undefined) return { offset: start }
  return { suffix: end }
}

async function handleAdmin(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  const auth = request.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!env.API_TOKEN || token !== env.API_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (url.pathname === '/api/admin/purge' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    return purgeCache(env, typeof body.prefix === 'string' ? body.prefix : '/*')
  }

  if (url.pathname === '/api/admin/warm' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}))
    return warmCache(env, body.prefix)
  }

  if (url.pathname === '/api/admin/sources' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM source_routes ORDER BY id').all()
    return jsonResponse(results || [])
  }

  if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
    const requestedDays = Number(url.searchParams.get('days') || 30)
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 90) : 30
    const { results } = await env.DB.prepare(`
      SELECT date, requests, hits, misses, bytes_served
      FROM cache_stats
      WHERE date >= date('now', ?)
      ORDER BY date DESC
    `).bind(`-${days - 1} days`).all()
    return jsonResponse(results || [])
  }

  if (url.pathname === '/api/admin/sources' && request.method === 'POST') {
    const body = await request.json().catch(() => null)
    const input = validateSourceRoute(body, env)
    if (!input.ok) return jsonResponse({ error: input.error }, 400)

    await env.DB.prepare(`
      INSERT INTO source_routes (prefix, origin, ttl, active, team_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(prefix) DO UPDATE SET
        origin = excluded.origin,
        ttl = excluded.ttl,
        active = excluded.active,
        team_id = excluded.team_id,
        updated_at = datetime('now')
    `).bind(input.value.prefix, input.value.origin, input.value.ttl, input.value.active, input.value.teamId).run()
    await purgeCache(env, input.value.prefix)
    return jsonResponse({ ok: true })
  }

  return new Response('Not Found', { status: 404 })
}

function validateSourceRoute(body, env) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'JSON object required' }
  if (typeof body.prefix !== 'string' || !/^\/[^\s]{0,255}$/.test(body.prefix)) {
    return { ok: false, error: 'prefix must be an absolute path' }
  }

  let originUrl
  try {
    originUrl = new URL(body.origin)
  } catch {
    return { ok: false, error: 'origin must be a valid URL' }
  }
  if (!['https:', 'http:'].includes(originUrl.protocol) || originUrl.username || originUrl.password ||
      originUrl.pathname !== '/' || originUrl.search || originUrl.hash) {
    return { ok: false, error: 'origin must be a plain HTTP(S) origin URL' }
  }

  const allowedOrigins = String(env.ORIGIN_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const normalizedOrigin = originUrl.origin.replace(/\/$/, '')
  if (allowedOrigins.length === 0 || !allowedOrigins.includes(normalizedOrigin)) {
    return { ok: false, error: 'origin is not in ORIGIN_ALLOWLIST' }
  }

  const ttl = body.ttl === undefined ? Number(env.DEFAULT_TTL || DEFAULT_TTL) : Number(body.ttl)
  if (!Number.isInteger(ttl) || ttl < 0 || ttl > 31_536_000) {
    return { ok: false, error: 'ttl must be an integer between 0 and 31536000' }
  }

  const teamId = body.teamId || body.team_id || 'default'
  if (typeof teamId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(teamId)) {
    return { ok: false, error: 'teamId contains invalid characters' }
  }

  return {
    ok: true,
    value: {
      prefix: body.prefix,
      origin: normalizedOrigin,
      ttl,
      active: body.active === false || body.active === 0 ? 0 : 1,
      teamId,
    },
  }
}

async function purgeCache(env, prefix) {
  const routePrefix = normalizePurgePrefix(prefix)
  const prefixes = []

  if (!routePrefix) {
    prefixes.push(R2_PREFIX)
  } else {
    const { results } = await env.DB.prepare('SELECT DISTINCT team_id as teamId FROM source_routes').all()
    for (const row of results || []) {
      prefixes.push(`${R2_PREFIX}${sanitizeKeySegment(row.teamId || 'default')}${routePrefix}`)
    }
    if (prefixes.length === 0) prefixes.push(`${R2_PREFIX}default${routePrefix}`)
  }

  let purged = 0
  for (const objectPrefix of prefixes) {
    purged += await deleteR2Prefix(env.CACHE_BUCKET, objectPrefix)
  }
  await bumpCacheVersion(env)
  return jsonResponse({ purged })
}

async function deleteR2Prefix(bucket, prefix) {
  let cursor
  let deleted = 0
  do {
    const page = await bucket.list({ prefix, cursor })
    for (const object of page.objects || []) {
      await bucket.delete(object.key)
      deleted += 1
    }
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  return deleted
}

function normalizePurgePrefix(prefix) {
  if (typeof prefix !== 'string') return ''
  const normalized = prefix.trim().replace(/^\*$/, '').replace(/\*$/, '')
  if (!normalized || normalized === '/') return ''
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

async function warmCache() {
  return jsonResponse({ warmed: 0, message: 'Resource catalog is not configured' }, 501)
}

async function getCacheVersion(env) {
  try {
    const row = await env.DB.prepare('SELECT version FROM cache_meta WHERE id = 1').first()
    return Number(row?.version) || DEFAULT_CACHE_VERSION
  } catch (error) {
    console.error('Cache version read error:', error)
    return DEFAULT_CACHE_VERSION
  }
}

async function bumpCacheVersion(env) {
  try {
    await env.DB.prepare(`
      INSERT INTO cache_meta (id, version)
      VALUES (1, 2)
      ON CONFLICT(id) DO UPDATE SET version = version + 1
    `).run()
  } catch (error) {
    console.error('Cache version update error:', error)
  }
}

function canStoreResponse(response, headers) {
  if (response.status < 200 || response.status >= 300) return false
  if (headers.has('Set-Cookie') || headers.get('Vary') === '*') return false
  const cacheControl = (headers.get('Cache-Control') || '').toLowerCase()
  return !/(^|[,\s])(private|no-store|no-cache)([,\s]|$)/.test(cacheControl)
}

async function storeResponse(env, cache, r2Key, cacheKey, originResponse, headers) {
  const contentLength = Number.parseInt(originResponse.headers.get('Content-Length') || '0', 10)
  if (contentLength && contentLength > Number(env.MAX_CACHE_SIZE || MAX_CACHE_SIZE)) return

  try {
    await env.CACHE_BUCKET.put(r2Key, await originResponse.clone().blob(), {
      httpMetadata: {
        contentType: originResponse.headers.get('content-type') || undefined,
        cacheControl: headers.get('Cache-Control') || undefined,
      },
    })
    await cache.put(cacheKey, new Response(originResponse.clone().body, {
      status: originResponse.status,
      headers,
    }))
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

function responseForCaller(response, request) {
  const clone = response.clone()
  return new Response(request.method === 'HEAD' ? null : clone.body, {
    status: response.status,
    headers: response.headers,
  })
}

function responseBytes(response) {
  return Number.parseInt(response.headers.get('Content-Length') || '0', 10) || 0
}

function track(ctx, env, kind, bytes) {
  ctx.waitUntil(recordStats(env, kind, bytes))
}

async function recordStats(env, kind, bytes) {
  const requestColumn = 'requests'
  const hitColumn = kind === 'hit' ? 'hits' : 'misses'
  try {
    await env.DB.prepare(`
      INSERT INTO cache_stats (date, requests, ${hitColumn}, bytes_served)
      VALUES (date('now'), 1, 1, ?)
      ON CONFLICT(date) DO UPDATE SET
        ${requestColumn} = ${requestColumn} + 1,
        ${hitColumn} = ${hitColumn} + 1,
        bytes_served = bytes_served + excluded.bytes_served
    `).bind(bytes).run()
  } catch (error) {
    console.error('Stats write error:', error)
  }
}

function sanitizeKeySegment(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '_') || 'default'
}

function withCors(response, request, env) {
  const origin = request.headers.get('Origin')
  const allowed = String(env.ADMIN_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!origin || !allowed.includes(origin)) return response

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  headers.set('Access-Control-Max-Age', '86400')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
