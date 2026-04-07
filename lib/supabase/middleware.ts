import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function missingConfigResponse() {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Configuration required</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#1e293b}
code{background:#f1f5f9;padding:0.15rem 0.35rem;border-radius:4px;font-size:0.9em}
h1{font-size:1.25rem}</style></head><body>
<h1>Supabase environment variables are missing</h1>
<p>Add these in your Vercel project: <strong>Settings → Environment Variables</strong> (Production), then redeploy:</p>
<ul>
<li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
<li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
<li><code>SUPABASE_SERVICE_ROLE_KEY</code></li>
</ul>
<p>Copy values from Supabase → <strong>Project Settings → API</strong>.</p>
</body></html>`
  return new NextResponse(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnonKey) {
    return missingConfigResponse()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Invalid character') || msg.includes('header')) {
      const clearResponse = NextResponse.redirect(new URL('/login', request.url))
      request.cookies.getAll().forEach(({ name }) => {
        if (name.startsWith('sb-')) clearResponse.cookies.delete(name)
      })
      return clearResponse
    }
  }

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isOAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback')

  if (!user && !isLoginPage && !isOAuthCallback) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
