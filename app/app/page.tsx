import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel, ArkButton } from "@/components/ArkUI";
import { purgeCache, warmCache, getStats } from "@/lib/api";

export default async function HomePage() {
  const stats = await getStats();
  const today = stats[0];

  return (
    <AppShell>
      <ArkSectionTitle kicker="DASHBOARD" index="01">
        CACHE RELAY
      </ArkSectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ArkPanel code="REQ / TODAY" title={today.requests.toLocaleString()}>
          <p>Total requests served today.</p>
        </ArkPanel>
        <ArkPanel code="HIT / RATIO" title={`${Math.round((today.hits / today.requests) * 100)}%`}>
          <p>Cache hit ratio across CDN and R2.</p>
        </ArkPanel>
        <ArkPanel code="BYTES / SERVED" title={formatBytes(today.bytes_served)}>
          <p>Data served from cache today.</p>
        </ArkPanel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArkPanel code="ACTION / PURGE" title="Clear Cache">
          <p className="mb-4">Remove cached objects from R2 and edge cache.</p>
          <form action={async () => {
            'use server';
            await purgeCache('/*');
          }}>
            <ArkButton primary type="submit">Purge All</ArkButton>
          </form>
        </ArkPanel>
        <ArkPanel code="ACTION / WARM" title="Preload Cache">
          <p className="mb-4">Fetch critical resources back into cache.</p>
          <form action={async () => {
            'use server';
            await warmCache('/*');
          }}>
            <ArkButton primary type="submit">Warm Up</ArkButton>
          </form>
        </ArkPanel>
      </div>
    </AppShell>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
