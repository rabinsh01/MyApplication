'use client'

import React, { useState, useMemo } from 'react'
import { Invoice } from '@/lib/fs-db'
import { Search, Filter, Download, MoreVertical, Edit2, Trash2, FileText, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
    initialInvoices: Invoice[]
}

const statusStyles = {
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-100',
    Unpaid: 'bg-rose-50 text-rose-700 border-rose-100',
} as const

export default function InvoiceTable({ initialInvoices }: Props) {
    const router = useRouter()
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [showDeleted, setShowDeleted] = useState(false)
    const [showOverdue, setShowOverdue] = useState(false)
    const [dateStart, setDateStart] = useState('')
    const [dateEnd, setDateEnd] = useState('')

    const handleSoftDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this invoice?')) return

        try {
            const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')

            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, is_deleted: true } : inv))
            toast.success('Invoice deleted successfully')
        } catch (e) {
            toast.error('Failed to delete invoice')
        }
    }

    const handleDownloadPdf = async (id: string, number: string) => {
        try {
            toast.loading('Generating PDF...', { id: 'pdf' })
            const res = await fetch(`/api/invoices/${id}/pdf`)
            if (!res.ok) throw new Error('Failed to generate PDF')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Invoice-${number}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)

            toast.success('PDF Downloaded', { id: 'pdf' })
        } catch (e) {
            toast.error('Failed to download PDF', { id: 'pdf' })
        }
    }

    const filteredInvoices = useMemo(() => {
        let result = invoices

        if (!showDeleted) {
            result = result.filter(inv => !inv.is_deleted)
        }

        if (showOverdue) {
            const today = startOfDay(new Date())
            result = result.filter(inv => {
                const invDate = parseISO(inv.date)
                return inv.amount_due > 0 && isBefore(invDate, today)
            })
        }

        if (statusFilter !== 'All') {
            result = result.filter(inv => inv.status === statusFilter)
        }

        if (dateStart) {
            result = result.filter(inv => inv.date >= dateStart)
        }

        if (dateEnd) {
            result = result.filter(inv => inv.date <= dateEnd)
        }

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(inv =>
                inv.invoice_number.toLowerCase().includes(q) ||
                inv.client_name.toLowerCase().includes(q) ||
                (inv.hidden_remarks || '').toLowerCase().includes(q) ||
                (inv.invoice_description || '').toLowerCase().includes(q)
            )
        }

        return result
    }, [invoices, search, statusFilter, showDeleted, showOverdue, dateStart, dateEnd])

    return (
        <div className="bg-white border text-sm border-neutral-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-neutral-100 bg-[#FAFAFA] space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Find invoices, clients or descriptions..."
                            className="pl-11 block w-full bg-white border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 outline-none border py-2.5 transition-all text-zinc-900"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-white border border-neutral-200 rounded-full px-4 py-1 shadow-sm">
                            <Filter className="h-3.5 w-3.5 text-zinc-400 mr-2" />
                            <select
                                title="Status filter"
                                className="bg-transparent text-zinc-700 font-bold py-1.5 outline-none text-xs"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Status</option>
                                <option value="Paid">Paid</option>
                                <option value="Partially Paid">Partially Paid</option>
                                <option value="Unpaid">Unpaid</option>
                            </select>
                        </div>

                        <div className="flex items-center bg-white border border-neutral-200 rounded-full px-4 py-1 shadow-sm">
                            <input
                                type="date"
                                title="Start Date"
                                className="bg-transparent text-zinc-700 font-bold py-1.5 outline-none text-xs"
                                value={dateStart}
                                onChange={e => setDateStart(e.target.value)}
                            />
                            <span className="mx-2 text-slate-300">to</span>
                            <input
                                type="date"
                                title="End Date"
                                className="bg-transparent text-slate-700 font-semibold py-1.5 outline-none text-xs"
                                value={dateEnd}
                                onChange={e => setDateEnd(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${showDeleted ? 'bg-zinc-950 border-zinc-950' : 'bg-white border-neutral-300 group-hover:border-zinc-400'}`}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={showDeleted}
                                onChange={e => setShowDeleted(e.target.checked)}
                            />
                            {showDeleted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <span className="text-zinc-600 font-bold text-xs uppercase tracking-widest">Show Deleted</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${showOverdue ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-300 group-hover:border-rose-400'}`}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={showOverdue}
                                onChange={e => setShowOverdue(e.target.checked)}
                            />
                            {showOverdue && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${showOverdue ? 'text-rose-100' : 'text-rose-500'}`} />
                            Overdue Only
                        </span>
                    </label>
                </div>
            </div>

            {/* ── MOBILE CARD VIEW ── */}
            <div className="md:hidden divide-y divide-slate-100">
                {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                        <div key={inv.id} className={`p-5 hover:bg-slate-50 transition-colors ${inv.is_deleted ? 'opacity-60 bg-slate-50' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusStyles[inv.status as keyof typeof statusStyles]}`}>
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-bold truncate">{inv.client_name}</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">{format(parseISO(inv.date), 'MMMM d, yyyy')}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="font-bold text-slate-900 text-base leading-tight">AED {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    <div className={`text-xs font-bold mt-1 ${inv.amount_due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {inv.amount_due > 0 ? `DUE: AED ${inv.amount_due.toFixed(2)}` : 'FULLY PAID'}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between bg-slate-50/50 rounded-xl p-2.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Svc <span className="text-slate-600">{inv.profit.toFixed(0)}</span> · Govt <span className="text-slate-600">{inv.commission.toFixed(0)}</span>
                                </div>
                                {inv.hidden_remarks && (
                                    <div className="mt-2 text-[11px] font-medium text-blue-600 bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <FileText className="w-3 h-3" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Internal Remarks</span>
                                        </div>
                                        {inv.hidden_remarks}
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)} className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-blue-600 hover:text-blue-700 transition-all active:scale-95" title="Download PDF">
                                        <Download className="h-4 w-4" />
                                    </button>
                                    <Link href={`/dashboard/edit/${inv.id}`} className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-slate-600 hover:text-slate-900 transition-all active:scale-95" title="Edit">
                                        <Edit2 className="h-4 w-4" />
                                    </Link>
                                    {!inv.is_deleted && (
                                        <button onClick={() => handleSoftDelete(inv.id)} className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 text-rose-400 hover:text-rose-600 transition-all active:scale-95" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-16 text-center">
                        <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <FileText className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No invoices found matching your filters.</p>
                    </div>
                )}
            </div>

            {/* ── DESKTOP TABLE VIEW ── */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-100">
                    <thead>
                        <tr className="bg-[#FAFAFA]">
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Invoice / Date</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Client</th>
                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount Info</th>
                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Balance Due</th>
                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-end gap-1">
                                Breakdown <InfoIcon className="w-3 h-3" />
                            </th>
                            <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {filteredInvoices.length > 0 ? (
                            filteredInvoices.map((inv) => (
                                <tr key={inv.id} className={`group hover:bg-slate-50/80 transition-all ${inv.is_deleted ? 'opacity-60 bg-slate-50/30' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{inv.invoice_number}</span>
                                            <span className="text-[11px] font-semibold text-slate-500 mt-0.5">{format(parseISO(inv.date), 'MMM d, yyyy')}</span>
                                            {inv.is_deleted && <span className="text-[10px] text-rose-500 font-bold mt-1 tracking-tighter uppercase">DELETED</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-slate-900 font-bold">{inv.client_name}</div>
                                        {inv.hidden_remarks && (
                                            <div className="text-[10px] text-blue-500 font-semibold bg-blue-50/50 px-2 py-0.5 rounded-md border border-blue-100/30 mt-1 max-w-[180px] truncate" title={inv.hidden_remarks}>
                                                {inv.hidden_remarks}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full border ${statusStyles[inv.status as keyof typeof statusStyles]}`}>
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-slate-900 font-bold leading-none">AED {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        <div className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">PAID: {inv.paid.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`font-bold text-sm ${inv.amount_due > 0 ? 'text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100' : 'text-slate-900'}`}>
                                            AED {inv.amount_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-[11px] font-semibold text-slate-500">
                                        <div>Svc: <span className="text-slate-900 font-bold">AED {inv.profit.toFixed(2)}</span></div>
                                        <div className="mt-0.5">Govt: <span className="text-slate-900 font-bold">AED {inv.commission.toFixed(2)}</span></div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)} className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 text-blue-600 transition-all hover:scale-110" title="Download PDF">
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <Link href={`/dashboard/edit/${inv.id}`} className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-500 transition-all hover:scale-110" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </Link>
                                            {!inv.is_deleted && (
                                                <button onClick={() => handleSoftDelete(inv.id)} className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 text-rose-400 transition-all hover:scale-110" title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <FileText className="h-10 w-10 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">No invoices found matching your filters.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    )
}
