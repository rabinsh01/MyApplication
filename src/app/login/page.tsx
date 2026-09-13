'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/app/login/actions'
import { Mail, Lock, Loader2, FileText } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData(e.currentTarget)
            const res = await login(formData)

            if (res?.error) {
                setError(res.error)
                setIsLoading(false)
            } else {
                router.refresh() // Clear Next.js cache so layout.tsx sees the new cookie
                router.push('/dashboard')
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during login. Did you configure Vercel environment variables?')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-zinc-950 rounded-full p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                        <FileText className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-8 text-center text-4xl font-black text-zinc-950 tracking-tighter">
                    Welcome Back
                </h2>
                <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Secure Invoice Management System
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[40px] sm:px-12 border border-neutral-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <form className="space-y-8" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-zinc-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full pl-12 pr-5 py-4 bg-neutral-50 border border-neutral-100 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all text-zinc-950"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">
                                Your Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-zinc-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="block w-full pl-12 pr-5 py-4 bg-neutral-50 border border-neutral-100 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all text-zinc-950"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-zinc-950 focus:ring-zinc-950 border-neutral-200 rounded-full"
                            />
                            <label htmlFor="remember-me" className="ml-3 block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Remember Device
                            </label>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-4 px-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.12)] text-xs font-black uppercase tracking-[0.2em] text-white bg-zinc-950 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 translate-y-0 hover:-translate-y-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4" />
                                        Processing...
                                    </>
                                ) : (
                                    'Access Dashboard'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
