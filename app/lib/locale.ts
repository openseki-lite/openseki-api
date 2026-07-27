import 'server-only';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, parseLocale } from './i18n';

export async function getLocale() {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
