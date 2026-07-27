import { redirect } from "next/navigation";
import { ArkButton, ArkPanel, ArkSectionTitle } from "@/components/ArkUI";
import { authenticateAdmin, isAdminAuthConfigured, isAdminAuthenticated } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { getMessages, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect('/');
  const params = await searchParams;
  const authConfigured = isAdminAuthConfigured();
  const locale = await getLocale();
  const t = getMessages(locale).login;
  const nextLocale: Locale = locale === 'zh-CN' ? 'en-US' : 'zh-CN';

  async function loginAction(formData: FormData) {
    'use server';
    const password = String(formData.get('password') || '');
    if (!(await authenticateAdmin(password))) redirect('/login?error=1');
    redirect('/');
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <form action="/api/locale" method="post" className="absolute right-6 top-6 md:right-10 md:top-10">
        <input name="locale" type="hidden" value={nextLocale} />
        <input name="returnTo" type="hidden" value="/login" />
        <button className="border border-current bg-transparent px-3 py-2 text-sm" type="submit">
          {locale === 'zh-CN' ? 'EN' : '中文'}
        </button>
      </form>
      <div className="mx-auto max-w-xl">
        <ArkSectionTitle kicker={t.kicker} index="00">
          {t.title}
        </ArkSectionTitle>
        <ArkPanel code={t.panelCode} title={t.panelTitle}>
          <form action={loginAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider">{t.password}</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border border-current bg-transparent px-3 py-2"
              />
            </label>
            {!authConfigured && (
              <p role="alert">{t.missingConfig}</p>
            )}
            {authConfigured && params.error && <p role="alert">{t.invalidPassword}</p>}
            <ArkButton primary type="submit" disabled={!authConfigured}>{t.signIn}</ArkButton>
          </form>
        </ArkPanel>
      </div>
    </main>
  );
}
