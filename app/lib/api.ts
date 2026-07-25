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
  return process.env.NEXT_PUBLIC_CACHE_API_BASE || '';
}

function getToken() {
  return process.env.NEXT_PUBLIC_CACHE_API_TOKEN || '';
}

async function fetchAdmin<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getBase();
  const token = getToken();
  const url = `${base}/api/admin${path}`;

  const res = await fetch(url, {
    ...options,
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
  // Worker does not expose a stats endpoint yet; return mock data for now.
  return [
    { date: 'today', requests: 1240, hits: 980, misses: 260, bytes_served: 1_024_000_000 },
    { date: 'yesterday', requests: 980, hits: 740, misses: 240, bytes_served: 820_000_000 },
  ];
}
