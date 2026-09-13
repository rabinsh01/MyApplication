'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function NavProgressBar() {
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()
    const [progress, setProgress] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    // We can't easily hook into Next.js App Router internal navigation events
    // but we can intercept clicks on links to start a local progress state.
    // However, the most reliable "instant" feedback is to listen for any click
    // on an <a> tag that points to an internal route.

    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const anchor = target.closest('a')

            if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
                // If it's a link to our own site, start the progress bar
                // unless it's a hash link or the current page
                const targetPath = new URL(anchor.href).pathname
                if (targetPath !== pathname) {
                    setIsVisible(true)
                    setProgress(10)

                    // Simulate progress until the page actually changes
                    const interval = setInterval(() => {
                        setProgress(prev => {
                            if (prev >= 90) {
                                clearInterval(interval)
                                return 90
                            }
                            return prev + 15
                        })
                    }, 50)

                        // Store interval to clear it on cleanup
                        ; (window as any)._navInterval = interval
                }
            }
        }

        window.addEventListener('click', handleAnchorClick)
        return () => {
            window.removeEventListener('click', handleAnchorClick)
            if ((window as any)._navInterval) clearInterval((window as any)._navInterval)
        }
    }, [pathname])

    // When the pathname changes, the navigation is complete
    useEffect(() => {
        if (isVisible) {
            setProgress(100)
            const timeout = setTimeout(() => {
                setIsVisible(false)
                setProgress(0)
            }, 50)
            return () => clearTimeout(timeout)
        }
        if ((window as any)._navInterval) clearInterval((window as any)._navInterval)
    }, [pathname])

    if (!isVisible) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
            <div
                className="h-[3px] bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}
