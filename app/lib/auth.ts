import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'opensekai_admin_session';
const SESSION_VALUE = 'authenticated';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function isAdminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

function sessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET must be configured on the server');
  return createHmac('sha256', secret).update(SESSION_VALUE).digest('hex');
}

function matchesSecret(provided: string, expected: string) {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export async function isAdminAuthenticated() {
  if (!isAdminAuthConfigured()) return false;
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === sessionToken();
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect('/login');
}

export async function authenticateAdmin(password: string) {
  if (!isAdminAuthConfigured()) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !matchesSecret(password, expected)) return false;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return true;
}
