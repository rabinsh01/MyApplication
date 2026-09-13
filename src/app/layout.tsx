import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import AutoLogout from '@/components/AutoLogout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Invoice Manager Pro',
  description: 'Professional invoice management SaaS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#FAFAFA] text-zinc-950 antialiased`}>
        <AutoLogout />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
