'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000 // 10 minutes

export default function AutoLogout() {
    const router = useRouter()

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const handleActivity = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                toast.error('Session expired due to inactivity.')
                router.push('/login')
                router.refresh()
            }, INACTIVITY_LIMIT_MS)
        }

        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
        
        events.forEach(evt => window.addEventListener(evt, handleActivity))
        handleActivity()

        return () => {
            clearTimeout(timeoutId)
            events.forEach(evt => window.removeEventListener(evt, handleActivity))
        }
    }, [router])

    return null
}
