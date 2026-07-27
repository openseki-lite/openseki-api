import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel } from "@/components/ArkUI";
import { getStats } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = getMessages(locale).stats;
  const stats = await getStats();

  return (
    <AppShell locale={locale}>
      <ArkSectionTitle kicker={t.kicker} index="03">
        {t.title}
      </ArkSectionTitle>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((day) => {
          const hitRatio = day.requests > 0 ? Math.round((day.hits / day.requests) * 100) : 0;
          return (
            <ArkPanel key={day.date} code={`DATE / ${day.date.toUpperCase()}`} title={day.requests.toLocaleString(locale)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">{t.hits}</p>
                  <p className="text-2xl font-bold">{day.hits.toLocaleString(locale)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">{t.misses}</p>
                  <p className="text-2xl font-bold">{day.misses.toLocaleString(locale)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-60">{t.hitRatio}</p>
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
        {stats.length === 0 && <p className="py-8 text-center opacity-60">{t.noStats}</p>}
      </div>
    </AppShell>
  );
}
