'use client'

import React, { useState } from 'react'
import { Service } from '@/lib/fs-db'
import { PlusCircle, Trash2, Briefcase, Loader2, Edit2, X, Check, Search } from 'lucide-react'
import { addService, deleteService, updateService } from '@/app/dashboard/services/actions'
import { toast } from 'sonner'

export default function ServiceManager({ initialServices }: { initialServices: Service[] }) {
    const [services, setServices] = useState<Service[]>(initialServices)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [totalAmount, setTotalAmount] = useState<number | ''>('')
    const [govtCharge, setGovtCharge] = useState<number | ''>('')
    const [serviceCharge, setServiceCharge] = useState<number | ''>('')
    const [editingId, setEditingId] = useState<string | null>(null)

    const handleGovtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value) || 0
        setGovtCharge(val)
        if (typeof serviceCharge === 'number') {
            setTotalAmount(val + serviceCharge)
        }
    }

    const handleServiceChange = (val: number) => {
        setServiceCharge(val)
        if (typeof govtCharge === 'number') {
            setTotalAmount(val + govtCharge)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || totalAmount === '' || govtCharge === '' || serviceCharge === '') return

        setIsLoading(true)
        try {
            if (editingId) {
                await updateService(editingId, {
                    name,
                    total_amount: totalAmount as number,
                    govt_charge: govtCharge as number,
                    service_charge: serviceCharge as number
                })
                setServices(services.map(s => s.id === editingId ? {
                    ...s,
                    name,
                    total_amount: totalAmount as number,
                    govt_charge: govtCharge as number,
                    service_charge: serviceCharge as number
                } : s))
                setEditingId(null)
                toast.success('Service updated successfully')
            } else {
                const newService = await addService({
                    name,
                    total_amount: totalAmount as number,
                    govt_charge: govtCharge as number,
                    service_charge: serviceCharge as number
                })
                setServices([newService, ...services])
                toast.success('Service added successfully')
            }

            setName('')
            setTotalAmount('')
            setGovtCharge('')
            setServiceCharge('')
            setIsAdding(false)
        } catch (error) {
            toast.error(editingId ? 'Failed to update service' : 'Failed to add service')
        }
        setIsLoading(false)
    }

    const handleEdit = (service: Service) => {
        setName(service.name)
        setGovtCharge(service.govt_charge)
        setServiceCharge(service.service_charge)
        setTotalAmount(service.total_amount)
        setEditingId(service.id)
        setIsAdding(true)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setName('')
        setTotalAmount('')
        setGovtCharge('')
        setServiceCharge('')
        setIsAdding(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return
        const res = await deleteService(id)
        if (res?.error) {
            toast.error(res.error)
        } else {
            setServices(services.filter(s => s.id !== id))
            toast.success('Service deleted')
        }
    }

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-2">
                <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">Services</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Manage your predefined services and pricing.</p>
                    </div>

                    <div className="flex-1 max-w-sm ml-0 sm:ml-6 relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-zinc-950">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Find a service..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-11 pr-4 py-2.5 border border-neutral-200 rounded-full text-sm bg-white shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 outline-none transition-all font-medium text-zinc-950"
                        />
                    </div>
                </div>
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-zinc-950 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-zinc-800 hover:-translate-y-0.5 transition-all outline-none"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Add Service
                    </button>
                ) : (
                    <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 bg-white text-zinc-600 px-6 py-2.5 rounded-full text-sm font-bold border border-neutral-200 shadow-sm hover:bg-neutral-50 transition-all outline-none"
                    >
                        <X className="h-4 w-4" />
                        Cancel
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xl font-bold text-zinc-950 mb-8 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-neutral-100 rounded-full text-zinc-950 border border-neutral-200">
                            {editingId ? <Edit2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                        </div>
                        {editingId ? 'Edit Service' : 'Add New Service'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Service Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full border-b-2 border-neutral-200 bg-transparent px-0 py-2 outline-none focus:border-zinc-950 text-zinc-950 text-lg font-semibold transition-all placeholder:text-neutral-300"
                                    placeholder="e.g. Executive Visa Processing"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Govt Charge (AED)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">AED</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={govtCharge}
                                        onChange={handleGovtChange}
                                        className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Charge (AED)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-emerald-600 font-bold text-sm">AED</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={serviceCharge}
                                        onChange={e => handleServiceChange(parseFloat(e.target.value) || 0)}
                                        className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold bg-emerald-50/30 transition-all text-emerald-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-50">
                            <div className="px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Total Package Cost</span>
                                <span className="text-xl font-black text-slate-900 leading-none">AED {Number(totalAmount || 0).toFixed(2)}</span>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-10 py-3.5 rounded-xl font-bold shadow-xl shadow-slate-200 hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : editingId ? <Check className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
                                {editingId ? 'Update Service' : 'Save Service'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden mt-6">
                <table className="min-w-full divide-y divide-neutral-100">
                    <thead className="bg-[#FAFAFA]">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Service Name</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pricing (AED)</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Govt Fee</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Our Charge</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {filteredServices.length > 0 ? (
                            filteredServices.map((service) => (
                                <tr key={service.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-900">{service.name}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-900 font-extrabold text-right">
                                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 group-hover:bg-white group-hover:shadow-sm transition-all whitespace-nowrap">
                                            {service.total_amount.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-xs text-slate-400 font-bold text-right leading-tight">
                                        {service.govt_charge.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-xs text-emerald-600 font-extrabold text-right leading-tight">
                                        {service.service_charge.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(service)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all hover:scale-110" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(service.id)} className="text-rose-400 hover:text-rose-600 p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all hover:scale-110" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                        <Briefcase className="h-10 w-10 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">No services found matching your criteria.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
