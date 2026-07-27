import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

const UNITY_CLIENT_ID = 'opensekai-unity';

function allowedOrigins() {
  return String(process.env.DOWNLOAD_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function nativeClientOrigin(request: NextRequest) {
  if (request.headers.get('x-opensekai-client') !== UNITY_CLIENT_ID) return null;

  const value = request.headers.get('x-opensekai-origin');
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value.replace(/\/$/, '')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string | null) {
  const headers = new Headers({ Vary: 'Origin, X-OpenSekai-Client, X-OpenSekai-Origin' });
  if (origin && allowedOrigins().includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, If-None-Match, Content-Type');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, ETag, X-Cache-Source');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

function errorResponse(status: number, message: string, origin: string | null) {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

function copyResponseHeaders(source: Headers, origin: string | null) {
  const headers = corsHeaders(origin);
  for (const name of [
    'Accept-Ranges',
    'Cache-Control',
    'Content-Length',
    'Content-Range',
    'Content-Type',
    'ETag',
    'X-Cache-Source',
  ]) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function proxyDownload(request: NextRequest, context: RouteContext) {
  const browserOrigin = requestOrigin(request);
  const accessOrigin = browserOrigin || nativeClientOrigin(request);
  if (!accessOrigin || !allowedOrigins().includes(accessOrigin)) {
    return errorResponse(403, 'Download origin is not allowed', null);
  }

  const workerBase = (process.env.CACHE_WORKER_BASE_URL || process.env.CACHE_API_BASE || '').replace(/\/$/, '');
  const internalToken = process.env.INTERNAL_PROXY_TOKEN || process.env.CACHE_API_TOKEN || '';
  if (!workerBase || !internalToken) {
    return errorResponse(503, 'Download service is not configured', browserOrigin);
  }

  const { path } = await context.params;
  const resourcePath = `/${path.map((segment) => encodeURIComponent(segment)).join('/')}`;
  const workerUrl = `${workerBase}${resourcePath}${request.nextUrl.search}`;
  const headers = new Headers({ 'X-Cache-Internal': internalToken });
  for (const name of ['Range', 'If-None-Match', 'If-Modified-Since']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let workerResponse: Response;
  try {
    workerResponse = await fetch(workerUrl, {
      method: request.method,
      headers,
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    return errorResponse(502, 'Download service is unavailable', browserOrigin);
  }

  if (!workerResponse.ok && workerResponse.status !== 304) {
    return errorResponse(workerResponse.status >= 500 ? 502 : workerResponse.status, 'Resource is unavailable', browserOrigin);
  }

  return new Response(request.method === 'HEAD' ? null : workerResponse.body, {
    status: workerResponse.status,
    headers: copyResponseHeaders(workerResponse.headers, browserOrigin),
  });
}

export async function OPTIONS(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!origin || !allowedOrigins().includes(origin)) {
    return errorResponse(403, 'Download origin is not allowed', null);
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyDownload(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxyDownload(request, context);
}
