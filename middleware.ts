
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createMiddlewareClient({ req, res }, {
        supabaseUrl,
        supabaseKey
    })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const url = req.nextUrl.clone()

    // Protected Routes (must be logged in)
    const protectedPaths = [
        '/dashboard',
        '/admin',
        '/contractmanagement',
        '/bid-agenda',
        '/(authenticated)' // catches the group if accessed directly somehow (though usually resolved to children)
    ]

    const isProtectedRoute = protectedPaths.some((path) =>
        url.pathname.startsWith(path)
    )

    // Auth Routes (only for logged OUT users)
    const authRoutes = ['/login']
    const isAuthRoute = authRoutes.some((path) => url.pathname.startsWith(path))

    // 1. If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!session && isProtectedRoute) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user is usage LOGGED IN and tries to access Login page -> Redirect to Dashboard
    if (session && isAuthRoute) {
        url.pathname = '/contractmanagement'
        url.search = '?tab=ongoing'
        return NextResponse.redirect(url)
    }

    // 3. (Optional) Redirect root '/' to '/dashboard' if logged in, or '/login' if not
    if (url.pathname === '/') {
        if (session) {
            url.pathname = '/contractmanagement'
            url.search = '?tab=ongoing'
            return NextResponse.redirect(url)
        } else {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return res
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot)$).*)',
    ],
}
