'use client'

import React, { useState, useMemo } from 'react'
import { TrendingUp, Wallet, ShieldCheck, Activity, Calendar, ArrowRight, DollarSign } from 'lucide-react'
import { Invoice } from '@/lib/fs-db'
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns'

interface Props {
    initialInvoices: Invoice[]
}

export default function ProfitPage({ initialInvoices }: Props) {
    const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

    // Lifetime stats (always from all invoices)
    const lifetimeStats = useMemo(() => {
        let totalRevenue = 0
        let totalProfit = 0
        initialInvoices.forEach(inv => {
            totalRevenue += inv.amount
            totalProfit += inv.profit
        })
        return { totalRevenue, totalProfit }
    }, [initialInvoices])

    // Filtered stats
    const filteredInvoices = useMemo(() => {
        return initialInvoices.filter(inv => {
            const invDate = parseISO(inv.date)
            return isWithinInterval(invDate, {
                start: parseISO(startDate),
                end: parseISO(endDate)
            })
        })
    }, [initialInvoices, startDate, endDate])

    const stats = useMemo(() => {
        let revenue = 0
        let paid = 0
        let govt = 0
        let profit = 0
        let due = 0

        filteredInvoices.forEach(inv => {
            revenue += inv.amount
            paid += inv.paid
            govt += inv.commission
            profit += inv.profit
            due += Math.max(0, inv.amount - inv.paid)
        })

        return { revenue, paid, govt, profit, due }
    }, [filteredInvoices])

    return (
        <div className="space-y-6 text-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-zinc-950 flex items-center gap-2 tracking-tight">
                        <TrendingUp className="h-6 w-6 text-zinc-950" />
                        Profit & Analytics
                    </h2>
                    <p className="text-sm text-zinc-500 font-medium mt-1">Track your business performance and obligations.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-full border border-neutral-200 shadow-sm">
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-9 pr-3 py-2 bg-neutral-50 border-none rounded-full text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-zinc-950/10 text-zinc-950"
                        />
                    </div>
                    <ArrowRight className="h-3 w-3 text-neutral-300" />
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="pl-9 pr-3 py-2 bg-neutral-50 border-none rounded-full text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-zinc-950/10 text-zinc-950"
                        />
                    </div>
                </div>
            </div>

            {/* Lifetime Summary Bar */}
            <div className="bg-zinc-950 rounded-3xl p-8 text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <TrendingUp className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Lifetime Net Profit</div>
                        <div className="text-5xl font-black tracking-tighter">AED {lifetimeStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="h-16 w-px bg-white/10 hidden md:block" />
                    <div>
                        <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Lifetime Billed</div>
                        <div className="text-3xl font-black tracking-tight">AED {lifetimeStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="flex-1 md:text-right">
                        <div className="inline-flex items-center gap-2 bg-white/5 text-zinc-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                            <Activity className="h-3 w-3" /> All Time Stats
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Filtered Revenue</div>
                        <div className="p-2.5 bg-neutral-100 text-zinc-950 rounded-full border border-neutral-200">
                            <Activity className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-zinc-950 tracking-tight">AED {stats.revenue.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-400 mt-2 uppercase font-black tracking-widest">{filteredInvoices.length} invoices</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Collected</div>
                        <div className="p-2.5 bg-neutral-100 text-zinc-950 rounded-full border border-neutral-200">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-zinc-950 tracking-tight">AED {stats.paid.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-600 mt-2 font-black uppercase tracking-widest">AED {stats.due.toFixed(2)} DUE</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-zinc-950 text-white flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Range Profit</div>
                        <div className="p-2.5 bg-white/10 text-white rounded-full border border-white/20">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-black tracking-tighter">AED {stats.profit.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-500 mt-2 font-black uppercase tracking-widest">Earned</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Govt Charges</div>
                        <div className="p-2.5 bg-neutral-100 text-zinc-950 rounded-full border border-neutral-200">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-zinc-950 tracking-tight">AED {stats.govt.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-400 mt-2 uppercase font-black tracking-widest">Tax & Fees</div>
                    </div>
                </div>
            </div>

            {filteredInvoices.length === 0 && (
                <div className="mt-12 bg-neutral-50 border border-dashed border-neutral-200 rounded-3xl p-16 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-neutral-200 mb-6" />
                    <h3 className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em] mb-2">No Transactions Found</h3>
                    <p className="text-sm text-zinc-400 font-medium">Select a wider date interval to generate analytics.</p>
                </div>
            )}
        </div>
    )
}
