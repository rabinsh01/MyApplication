import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function cleanUrl(rawUrl?: string): string {
    if (!rawUrl) return ''
    let u = rawUrl.trim()
    u = u.replace(/\/+$/, '')
    u = u.replace(/\/(auth|rest)\/v\d+.*$/i, '')
    return u
}

export async function createClient() {
    const cookieStore = await cookies()

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    const url = cleanUrl(rawUrl)

    if (!url || !key) {
        throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in Vercel settings.')
    }

    return createServerClient(
        url,
        key.trim(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
