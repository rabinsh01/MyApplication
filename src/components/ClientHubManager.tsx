'use client'

import React, { useState } from 'react'
import { PlusCircle, Users, FileText, TrendingUp, ArrowRight, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { addClientAction, editClientAction } from '@/app/dashboard/clients/actions'
import { toast } from 'sonner'

interface ClientStats {
    name: string
    mobile?: string
    email?: string
    invoiceCount: number
    totalBilled: number
    totalPaid: number
    totalDue: number
    totalProfit: number
}

export default function ClientHubManager({ initialClients }: { initialClients: ClientStats[] }) {
    const [clients, setClients] = useState<ClientStats[]>(initialClients)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [editingClientName, setEditingClientName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [newName, setNewName] = useState('')
    const [newMobile, setNewMobile] = useState('')
    const [newEmail, setNewEmail] = useState('')

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        setIsLoading(true)
        if (editingClientName) {
            const res = await editClientAction(editingClientName, { 
                name: newName.trim(),
                mobile: newMobile.trim(), 
                email: newEmail.trim() 
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Client updated successfully')
                setClients(clients.map(c => 
                    c.name === editingClientName 
                        ? { ...c, name: newName.trim(), mobile: newMobile.trim(), email: newEmail.trim() } 
                        : c
                ).sort((a, b) => a.name.localeCompare(b.name)))
                cancelEdit()
            }
        } else {
            const res = await addClientAction(newName, newMobile)

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Client added successfully')
                const newClient: ClientStats = {
                    name: newName.trim(),
                    mobile: newMobile.trim(),
                    email: newEmail.trim(),
                    invoiceCount: 0,
                    totalBilled: 0,
                    totalPaid: 0,
                    totalDue: 0,
                    totalProfit: 0
                }
                setClients([newClient, ...clients].sort((a, b) => a.name.localeCompare(b.name)))
                cancelEdit()
            }
        }
        setIsLoading(false)
    }

    const startEdit = (client: ClientStats) => {
        setEditingClientName(client.name)
        setNewName(client.name)
        setNewMobile(client.mobile || '')
        setNewEmail(client.email || '')
        setIsAdding(true)
    }

    const cancelEdit = () => {
        setEditingClientName(null)
        setNewName('')
        setNewMobile('')
        setNewEmail('')
        setIsAdding(false)
    }

    const handleDeleteClient = async (name: string, e: React.MouseEvent) => {
        e.preventDefault() // prevent navigating if it's wrapped
        e.stopPropagation()

        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return

        setIsLoading(true)
        const toastId = toast.loading('Deleting client...')
        const { deleteClientAction } = await import('@/app/dashboard/clients/actions')
        const res = await deleteClientAction(name)

        if (res.error) {
            toast.error(res.error, { id: toastId })
        } else {
            toast.success('Client deleted', { id: toastId })
            setClients(clients.filter(c => c.name !== name))
        }
        setIsLoading(false)
    }

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-2">
                <div className="flex-1 w-full">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight text-white">Clients Hub</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage your clients and view their specific metrics.</p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-zinc-950 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 shadow-sm transition-all text-zinc-950"
                        />
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 bg-zinc-950 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-zinc-800 hover:-translate-y-0.5 transition-all whitespace-nowrap"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Add Client
                        </button>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] animate-in fade-in slide-in-from-top-4 duration-300 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-neutral-100 rounded-full text-zinc-950 border border-neutral-200">
                            {editingClientName ? <Users className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                        </div>
                        <h3 className="text-xl font-bold text-zinc-950 tracking-tight">{editingClientName ? 'Edit Client Partner' : 'New Client Partner'}</h3>
                    </div>
                    <form onSubmit={handleAddClient} className="space-y-8">
                        <div>
                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Client Full Name</label>
                            <input
                                type="text"
                                required
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className={`w-full border-b-2 border-neutral-200 bg-transparent px-0 py-2 outline-none focus:border-zinc-950 text-zinc-950 text-lg font-semibold transition-all placeholder:text-neutral-300`}
                                placeholder="Enter legal client name..."
                                autoFocus={!editingClientName}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Mobile Number <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={newMobile}
                                    onChange={e => setNewMobile(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium transition-all"
                                    placeholder="e.g. +971 50 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Email Address <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium transition-all"
                                    placeholder="client@example.com"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-4 border-t border-neutral-100">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-6 py-2.5 rounded-full text-sm font-bold text-zinc-500 hover:text-zinc-900 hover:bg-neutral-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-zinc-950 text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-zinc-800 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingClientName ? 'Save Changes' : 'Save Partner'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                        <div key={client.name} className="bg-white border border-neutral-200 rounded-3xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group flex flex-col group hover:-translate-y-1">
                            <div className="p-8 flex-1">
                                <div className="flex items-start justify-between mb-8">

                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-neutral-100 border border-neutral-200 text-zinc-950 rounded-full flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                                            {client.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-zinc-950 line-clamp-1 group-hover:text-zinc-600 transition-colors" title={client.name}>{client.name}</h3>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase w-fit">CLIENT PARTNER</span>
                                                {client.mobile && <span className="text-[10px] font-bold text-zinc-500">{client.mobile}</span>}
                                                {client.email && <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[150px]" title={client.email}>{client.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.preventDefault(); startEdit(client); }}
                                            className="h-8 w-8 rounded-full border border-neutral-200 flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:bg-neutral-50 transition-all z-10 relative"
                                            title="Edit Client"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClient(client.name, e)}
                                            className="h-8 w-8 rounded-full border border-rose-100 flex items-center justify-center text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all z-10 relative"
                                            title="Delete Client"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        </button>
                                        <div className="hidden sm:flex h-8 w-8 rounded-full border border-neutral-200 items-center justify-center text-zinc-300 group-hover:text-zinc-950 group-hover:border-zinc-950 transition-all ml-1">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-[#FAFAFA] p-5 rounded-2xl border border-neutral-100">
                                    <div>
                                        <div className="text-zinc-400 text-[9px] uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Invoices</div>
                                        <div className="font-black text-zinc-950 text-base">{client.invoiceCount}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-zinc-400 text-[9px] uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5 justify-end"><TrendingUp className="w-3 h-3" /> Revenue</div>
                                        <div className="font-black text-zinc-950 text-base">{client.totalProfit.toFixed(0)} <span className="text-[10px] text-zinc-400 font-bold">AED</span></div>
                                    </div>
                                </div>

                                <div className="space-y-2.5 text-xs font-bold pt-1">
                                    <div className="flex justify-between items-center text-zinc-400">
                                        <span className="uppercase tracking-widest text-[9px]">Total Volume:</span>
                                        <span className="text-zinc-950">AED {client.totalBilled.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400 uppercase tracking-widest text-[9px]">Outstanding:</span>
                                        <span className={`${client.totalDue > 0 ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200' : 'text-zinc-950'}`}>
                                            AED {client.totalDue.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Link href={`/dashboard/clients/${encodeURIComponent(client.name)}`} className="bg-[#FAFAFA] border-t border-neutral-100 p-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white group-hover:bg-zinc-950 transition-colors flex items-center justify-center gap-2">
                                Access Detailed Portal <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-24 bg-white rounded-3xl border border-neutral-200 shadow-sm">
                        <div className="bg-[#FAFAFA] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-neutral-100">
                            <Users className="h-10 w-10 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-950 tracking-tight">Expand Your Network</h3>
                        <p className="text-zinc-400 mt-2 font-medium max-w-xs mx-auto">Start by adding your first client partner to track performance.</p>
                        <button onClick={() => setIsAdding(true)} className="mt-8 font-bold text-zinc-950 hover:text-zinc-700 flex items-center gap-2 mx-auto transition-colors">
                            <PlusCircle className="w-5 h-5" /> Add Partner Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
