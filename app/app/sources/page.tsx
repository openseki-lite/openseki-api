import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { ArkSectionTitle, ArkPanel, ArkButton } from "@/components/ArkUI";
import { listSources, upsertSource } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  await requireAdmin();
  const sources = await listSources();

  return (
    <AppShell>
      <ArkSectionTitle kicker="SOURCE ROUTES" index="02">
        ROUTING TABLE
      </ArkSectionTitle>

      <ArkPanel code="ADD / ROUTE" title="New Source" className="mb-8">
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
            <span className="text-xs uppercase tracking-wider">Prefix</span>
            <input name="prefix" placeholder="/api/*" required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-wider">Origin</span>
            <input name="origin" placeholder="https://upstream.example.com" required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider">TTL</span>
            <input name="ttl" type="number" defaultValue={604800} required className="border border-current bg-transparent px-3 py-2" />
          </label>
          <div className="md:col-span-4">
            <ArkButton primary type="submit">Add Route</ArkButton>
          </div>
        </form>
      </ArkPanel>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-current">
              <th className="py-3 px-4 text-xs uppercase tracking-wider">Prefix</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">Origin</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">TTL</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 px-4 text-center opacity-60">
                  No routes configured.
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
                  {route.active ? 'Active' : 'Inactive'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
