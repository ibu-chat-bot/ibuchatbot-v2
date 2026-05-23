import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request) {
  const token = request.cookies.get('ibu_admin_token')?.value
  const { pathname } = request.nextUrl

  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPath = pathname === '/admin/login' || pathname.startsWith('/admin/login/')
  const isApiPath = pathname.startsWith('/api/admin') && !pathname.includes('/auth/login')

  const SECRET_KEY = new TextEncoder().encode(
    process.env.NEXTJS_SECRET || 'ibu_chatbot_v2_admin_panel_secure_secret_token'
  )

  // 1. Fast-track exclusion for the login page
  if (isLoginPath) {
    if (token) {
      try {
        await jwtVerify(token, SECRET_KEY)
        // If already authenticated, redirect away from login to dashboard
        return NextResponse.redirect(new URL('/admin/knowledge', request.url))
      } catch {
        // Expired/invalid token, delete it and load login page
        const response = NextResponse.next()
        response.cookies.delete('ibu_admin_token')
        return response
      }
    }
    return NextResponse.next()
  }

  // 2. Redirect root /admin to /admin/knowledge
  if (pathname === '/admin' || pathname === '/admin/') {
    if (token) {
      try {
        await jwtVerify(token, SECRET_KEY)
        return NextResponse.redirect(new URL('/admin/knowledge', request.url))
      } catch {
        const response = NextResponse.redirect(new URL('/admin/login', request.url))
        response.cookies.delete('ibu_admin_token')
        return response
      }
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // 3. Authenticated paths guard
  if (isAdminPath || isApiPath) {
    if (!token) {
      if (isApiPath) {
        return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      await jwtVerify(token, SECRET_KEY)
    } catch (err) {
      if (isApiPath) {
        return NextResponse.json({ error: 'Oturum süresi dolmuş veya geçersiz' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete('ibu_admin_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*']
}
