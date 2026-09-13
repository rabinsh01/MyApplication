import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, LogOut, PlusCircle, LayoutDashboard, Briefcase, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import NavProgressBar from '@/components/NavProgressBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const handleSignOut = async () => {
        'use server'
        const supabaseServer = await createClient()
        await supabaseServer.auth.signOut()
        revalidatePath('/', 'layout')
        redirect('/login')
    }

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/create', label: 'Create Invoice', icon: PlusCircle },
        { href: '/dashboard/services', label: 'Services', icon: Briefcase },
        { href: '/dashboard/clients', label: 'Clients', icon: Users },
        { href: '/dashboard/profit', label: 'Profit', icon: TrendingUp },
    ]

    return (
        <div className="min-h-screen flex bg-[#FAFAFA]">
            <NavProgressBar />
            {/* Sidebar — desktop only */}
            <aside className="w-[280px] bg-white/70 backdrop-blur-2xl border-r border-neutral-200/60 hidden md:flex flex-col flex-shrink-0 z-20 sticky top-0 h-screen">
                <div className="h-20 flex items-center px-8 border-b border-neutral-200/50">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="bg-zinc-950 rounded-full p-2.5 shadow-md shadow-zinc-200 group-hover:scale-105 transition-all duration-300">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-zinc-950 tracking-tight">
                            InvoicePro
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            className="flex items-center justify-between group px-4 py-3 rounded-2xl text-sm font-semibold text-zinc-500 hover:bg-zinc-950 hover:text-white transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
                                <span>{item.label}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-white" />
                        </Link>
                    ))}
                </nav>

                <div className="p-6 mt-auto border-t border-neutral-200/50 bg-[#FAFAFA]/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-950 shadow-sm">
                            <span className="font-bold text-sm tracking-tight">{user.email?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-950 truncate tracking-tight">Admin User</p>
                            <p className="text-xs text-zinc-500 truncate font-medium">{user.email}</p>
                        </div>
                    </div>
                    <form action={handleSignOut}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 hover:text-white hover:bg-zinc-950 py-2.5 rounded-full transition-all duration-300">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Top Navbar */}
                <header className="h-16 glass border-b border-neutral-200/50 flex items-center justify-between px-6 sm:px-8 lg:px-10 z-10 sticky top-0 transition-all">
                    <div className="flex items-center gap-3">
                        {/* Mobile logo */}
                        <div className="flex md:hidden items-center gap-2">
                            <div className="bg-zinc-950 rounded-full p-2 shadow-sm">
                                <FileText className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-zinc-950 tracking-tight text-lg">InvoicePro</span>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-zinc-400">
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="text-sm font-medium">/</span>
                            <span className="text-sm font-bold text-zinc-950 tracking-tight">Dashboard</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-500 hidden sm:inline">System Live</span>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
                    <div className="py-8 px-6 sm:px-8 lg:px-10 max-w-7xl mx-auto pb-32 md:pb-12">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-6 left-4 right-4 glass border border-neutral-200/50 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full overflow-hidden">
                <div className="flex items-center h-16">
                    <Link href="/dashboard" prefetch={true} className="flex-1 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-zinc-950 transition-colors">
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Home</span>
                    </Link>
                    <Link href="/dashboard/services" prefetch={true} className="flex-1 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-zinc-950 transition-colors">
                        <Briefcase className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Svcs</span>
                    </Link>
                    <Link href="/dashboard/create" prefetch={true} className="flex-1 flex flex-col items-center justify-center gap-1 -mt-6">
                        <div className="bg-zinc-950 rounded-full p-3 shadow-[0_8px_20px_rgb(0,0,0,0.12)] border-2 border-white group-hover:scale-105 transition-transform">
                            <PlusCircle className="h-6 w-6 text-white" />
                        </div>
                    </Link>
                    <Link href="/dashboard/profit" prefetch={true} className="flex-1 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-zinc-950 transition-colors">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Stats</span>
                    </Link>
                    <form action={handleSignOut} className="flex-1">
                        <button type="submit" className="w-full h-full flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-rose-500 transition-colors py-3">
                            <LogOut className="h-5 w-5" />
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Exit</span>
                        </button>
                    </form>
                </div>
            </nav>
        </div>
    )
}
