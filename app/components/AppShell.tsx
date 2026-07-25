'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArkShell, type NavItem } from './ArkUI';

const nav: NavItem[] = [
  { id: '/', label: 'Overview' },
  { id: '/sources', label: 'Sources' },
  { id: '/stats', label: 'Stats' },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <ArkShell
      brand="OPENSEKI"
      code="CACHE RELAY / 01"
      status="RELAY ONLINE"
      theme="endfield"
      depth="moderate"
      nav={nav}
      activeId={pathname || '/'}
      onNavigate={(id) => router.push(id)}
    >
      <div className="p-6 md:p-10">{children}</div>
    </ArkShell>
  );
}
