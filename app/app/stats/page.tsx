import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel } from "@/components/ArkUI";
import { getStats } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  await requireAdmin();
  const stats = await getStats();

  return (
    <AppShell>
      <ArkSectionTitle kicker="CACHE STATISTICS" index="03">
        METRICS
      </ArkSectionTitle>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((day) => {
          const hitRatio = day.requests > 0 ? Math.round((day.hits / day.requests) * 100) : 0;
          return (
            <ArkPanel key={day.date} code={`DATE / ${day.date.toUpperCase()}`} title={day.requests.toLocaleString()}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">Hits</p>
                  <p className="text-2xl font-bold">{day.hits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">Misses</p>
                  <p className="text-2xl font-bold">{day.misses.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">Hit Ratio</p>
                  <p className="text-2xl font-bold">{hitRatio}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-current/10">
                <div
                  className="h-full bg-[#fffa00]"
                  style={{ width: `${hitRatio}%` }}
                />
              </div>
            </ArkPanel>
          );
        })}
      </div>
    </AppShell>
  );
}
