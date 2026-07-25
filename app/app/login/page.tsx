import { redirect } from "next/navigation";
import { ArkButton, ArkPanel, ArkSectionTitle } from "@/components/ArkUI";
import { authenticateAdmin, isAdminAuthConfigured, isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect('/');
  const params = await searchParams;
  const authConfigured = isAdminAuthConfigured();

  async function loginAction(formData: FormData) {
    'use server';
    const password = String(formData.get('password') || '');
    if (!(await authenticateAdmin(password))) redirect('/login?error=1');
    redirect('/');
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-xl">
        <ArkSectionTitle kicker="ACCESS CONTROL" index="00">
          ADMIN LOGIN
        </ArkSectionTitle>
        <ArkPanel code="SESSION / PRIVATE" title="OpenSekai Cache Relay">
          <form action={loginAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="border border-current bg-transparent px-3 py-2"
              />
            </label>
            {!authConfigured && (
              <p role="alert">Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET on the server first.</p>
            )}
            {authConfigured && params.error && <p role="alert">Invalid password.</p>}
            <ArkButton primary type="submit" disabled={!authConfigured}>Sign In</ArkButton>
          </form>
        </ArkPanel>
      </div>
    </main>
  );
}
