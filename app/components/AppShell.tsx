'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArkShell, type NavItem } from './ArkUI';
import { getMessages, type Locale } from '@/lib/i18n';

interface AppShellProps {
  children: React.ReactNode;
  locale: Locale;
}

export function AppShell({ children, locale }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = getMessages(locale);
  const nav: NavItem[] = [
    { id: '/', label: t.nav.overview },
    { id: '/sources', label: t.nav.sources },
    { id: '/stats', label: t.nav.stats },
  ];
  const nextLocale: Locale = locale === 'zh-CN' ? 'en-US' : 'zh-CN';

  return (
    <ArkShell
      brand="OPENSEKI"
      code="CACHE RELAY / 01"
      status={t.shell.status}
      theme="endfield"
      depth="moderate"
      nav={nav}
      activeId={pathname || '/'}
      onNavigate={(id) => router.push(id)}
      menuLabel={t.shell.menu}
      navigationLabel={t.shell.navigation}
      headerAction={
        <form action="/api/locale" method="post">
          <input name="locale" type="hidden" value={nextLocale} />
          <input name="returnTo" type="hidden" value={pathname || '/'} />
          <button className="arkR-language" type="submit" title={t.shell.switchLanguage}>
            {locale === 'zh-CN' ? 'EN' : '中文'}
          </button>
        </form>
      }
    >
      <div className="p-6 md:p-10">{children}</div>
    </ArkShell>
  );
}
