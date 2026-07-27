import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, parseLocale } from '@/lib/i18n';

function safeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === 'string' ? value : '';
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const response = NextResponse.redirect(new URL(safeReturnPath(formData.get('returnTo')), request.url), 303);
  response.cookies.set(LOCALE_COOKIE, parseLocale(String(formData.get('locale') || '')), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return response;
}
