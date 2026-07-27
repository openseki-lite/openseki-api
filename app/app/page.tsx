import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel, ArkButton } from "@/components/ArkUI";
import { purgeCache, warmCache, getStats } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = getMessages(locale).dashboard;
  const stats = await getStats();
  const today = stats[0] ?? { requests: 0, hits: 0, misses: 0, bytes_served: 0 };

  return (
    <AppShell locale={locale}>
      <ArkSectionTitle kicker={t.kicker} index="01">
        {t.title}
      </ArkSectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ArkPanel code={t.requests} title={today.requests.toLocaleString(locale)}>
          <p>{t.requestsDescription}</p>
        </ArkPanel>
        <ArkPanel code={t.hitRatio} title={`${today.requests > 0 ? Math.round((today.hits / today.requests) * 100) : 0}%`}>
          <p>{t.hitRatioDescription}</p>
        </ArkPanel>
        <ArkPanel code={t.bytesServed} title={formatBytes(today.bytes_served)}>
          <p>{t.bytesDescription}</p>
        </ArkPanel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArkPanel code={t.purgeCode} title={t.purgeTitle}>
          <p className="mb-4">{t.purgeDescription}</p>
          <form action={async () => {
            'use server';
            await requireAdmin();
            await purgeCache('/*');
            revalidatePath('/');
            revalidatePath('/sources');
            revalidatePath('/stats');
          }}>
            <ArkButton primary type="submit">{t.purgeButton}</ArkButton>
          </form>
        </ArkPanel>
        <ArkPanel code={t.warmCode} title={t.warmTitle}>
          <p className="mb-4">{t.warmDescription}</p>
          <form action={async () => {
            'use server';
            await requireAdmin();
            await warmCache('/*');
            revalidatePath('/');
          }}>
            <ArkButton primary type="submit">{t.warmButton}</ArkButton>
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
