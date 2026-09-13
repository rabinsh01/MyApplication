import { createBrowserClient } from '@supabase/ssr'

function cleanUrl(rawUrl?: string): string {
    if (!rawUrl) return ''
    let u = rawUrl.trim()
    u = u.replace(/\/+$/, '')
    u = u.replace(/\/(auth|rest)\/v\d+.*$/i, '')
    return u
}

export function createClient() {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const url = cleanUrl(rawUrl)

    if (!url || !key) {
        throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in build. Please verify Vercel Environment Variables and redeploy.')
    }

    return createBrowserClient(url, key.trim())
}
