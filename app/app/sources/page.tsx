import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel, ArkButton } from "@/components/ArkUI";
import {
  getOriginAllowlist,
  listSources,
  resetOriginAllowlist,
  setOriginAllowlist,
  upsertSource,
} from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { getMessages } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = getMessages(locale).sources;
  const [sources, allowlist] = await Promise.all([listSources(), getOriginAllowlist()]);

  async function saveAllowlistAction(formData: FormData) {
    'use server';
    await requireAdmin();
    const origins = String(formData.get('origins') || '')
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    await setOriginAllowlist(origins);
    revalidatePath('/sources');
  }

  async function resetAllowlistAction() {
    'use server';
    await requireAdmin();
    await resetOriginAllowlist();
    revalidatePath('/sources');
  }

  return (
    <AppShell locale={locale}>
      <ArkSectionTitle kicker={t.kicker} index="02">
        {t.title}
      </ArkSectionTitle>

      <ArkPanel code={t.allowlistCode} title={t.allowlistTitle} className="mb-8">
        <form action={saveAllowlistAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider">{allowlist.source === 'database' ? t.dynamicAllowlist : t.environmentAllowlist}</span>
            <textarea
              name="origins"
              rows={Math.max(4, allowlist.origins.length + 1)}
              defaultValue={allowlist.origins.join('\n')}
              placeholder={t.allowlistPlaceholder}
              className="border border-current bg-transparent px-3 py-2 font-mono"
            />
          </label>
          <p className="text-sm opacity-70">{t.allowlistDescription}</p>
          <div><ArkButton primary type="submit">{t.saveAllowlist}</ArkButton></div>
        </form>
        {allowlist.source === 'database' && (
          <form action={resetAllowlistAction} className="mt-3">
            <ArkButton type="submit">{t.resetAllowlist}</ArkButton>
          </form>
        )}
      </ArkPanel>

      <ArkPanel code={t.routeCode} title={t.routeTitle} className="mb-8">
        <form
          action={async (formData) => {
            'use server';
            await requireAdmin();
            await upsertSource({
              prefix: String(formData.get('prefix')),
              origin: String(formData.get('origin')),
              ttl: Number(formData.get('ttl')) || 604800,
              active: 1,
              team_id: 'default',
            });
            revalidatePath('/sources');
            revalidatePath('/');
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider">{t.prefix}</span>
            <input name="prefix" placeholder="/api/*" required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-wider">{t.origin}</span>
            <input name="origin" placeholder={t.allowlistPlaceholder} required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider">{t.ttl}</span>
            <input name="ttl" type="number" defaultValue={604800} required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <div className="md:col-span-4">
            <ArkButton primary type="submit">{t.addRoute}</ArkButton>
          </div>
        </form>
      </ArkPanel>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-current">
              <th className="py-3 px-4 text-xs uppercase tracking-wider">{t.prefix}</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">{t.origin}</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">{t.ttl}</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-4 text-center opacity-60">
                  {t.noRoutes}
                </td>
              </tr>
            )}
            {sources.map((route) => (
              <tr key={route.id} className="border-b border-current/20">
                <td className="py-3 px-4 font-mono">{route.prefix}</td>
                <td className="py-3 px-4 font-mono">{route.origin}</td>
                <td className="py-3 px-4">{route.ttl}s</td>
                <td className="py-3 px-4">
                  <span className={`inline-block w-2 h-2 mr-2 ${route.active ? 'bg-[#00ffa2]' : 'bg-[#888888]'}`} />
                  {route.active ? t.active : t.inactive}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
