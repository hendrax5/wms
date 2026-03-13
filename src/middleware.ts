import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionToken =
        request.cookies.get("next-auth.session-token") ||
        request.cookies.get("__Secure-next-auth.session-token") ||
        request.cookies.get("authjs.session-token") ||
        request.cookies.get("__Secure-authjs.session-token");

    const { pathname } = request.nextUrl;

    // Public routes
    if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        if (sessionToken && pathname === "/login") {
            // If already logged in, redirect to dashboard
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // Protected routes
    if (!sessionToken) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
