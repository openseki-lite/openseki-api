import 'server-only';

export interface SourceRoute {
  id: number;
  prefix: string;
  origin: string;
  ttl: number;
  active: number;
  team_id: string;
  created_at: string;
  updated_at: string;
}

export interface CacheStats {
  date: string;
  requests: number;
  hits: number;
  misses: number;
  bytes_served: number;
}

function getBase() {
  return (process.env.CACHE_API_BASE || '').replace(/\/$/, '');
}

function getToken() {
  return process.env.CACHE_API_TOKEN || '';
}

async function fetchAdmin<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getBase();
  const token = getToken();
  if (!base || !token) {
    throw new Error('CACHE_API_BASE and CACHE_API_TOKEN must be configured on the server');
  }
  const url = `${base}/api/admin${path}`;

  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function listSources(): Promise<SourceRoute[]> {
  return fetchAdmin<SourceRoute[]>('/sources');
}

export async function upsertSource(body: Partial<SourceRoute>) {
  return fetchAdmin('/sources', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function purgeCache(prefix = '/*') {
  return fetchAdmin('/purge', {
    method: 'POST',
    body: JSON.stringify({ prefix }),
  });
}

export async function warmCache(prefix?: string) {
  return fetchAdmin('/warm', {
    method: 'POST',
    body: JSON.stringify({ prefix }),
  });
}

export async function getStats(): Promise<CacheStats[]> {
  try {
    return await fetchAdmin<CacheStats[]>('/stats?days=30');
  } catch (error) {
    // Older deployed Workers do not expose stats yet; keep the dashboard usable.
    if (error instanceof Error && error.message.startsWith('API error 404:')) return [];
    throw error;
  }
}
