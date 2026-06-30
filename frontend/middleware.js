import { NextResponse } from 'next/server';

const PROTECTED = ['/profile'];
const COOKIE_NAME = 'auth_token';

export default function middleware(req) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?|ttf|woff2?|ico|gif|svg|jpg|jpeg|png|webp)).*)',
  ],
};
