import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'ems_access';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/attendance',
  '/board',
  '/employees',
  '/teams',
  '/tasks',
  '/feedback',
  '/organization',
  '/admin',
  '/account',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isSafeSameOriginPath(candidate: string): boolean {
  return candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\');
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === '/login' && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedPath(pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    const requested = `${pathname}${search}`;
    if (isSafeSameOriginPath(requested)) {
      loginUrl.searchParams.set('next', requested);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/attendance/:path*',
    '/board/:path*',
    '/employees/:path*',
    '/teams/:path*',
    '/tasks/:path*',
    '/feedback/:path*',
    '/organization/:path*',
    '/admin/:path*',
    '/account/:path*',
  ],
};
