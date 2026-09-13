'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Invoice, Service } from '@/lib/fs-db'
import { toast } from 'sonner'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { addClientAction } from '@/app/dashboard/clients/actions'
import { addService } from '@/app/dashboard/services/actions'
import { Loader2, Save, ArrowLeft, Plus, Trash2, Hash } from 'lucide-react'
import Link from 'next/link'

interface LineItem {
    id: string
    service_id?: string
    name: string
    description?: string
    qty: number
    rate: number
    govt_charge: number
    service_charge: number
    total: number
}

interface Props {
    initialData?: Invoice
    isEdit?: boolean
    knownClients?: string[]
    nextInvoiceNumber?: string
    services?: Service[]
}

export default function InvoiceForm({ initialData, isEdit, knownClients = [], nextInvoiceNumber = '', services = [] }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clientOptions, setClientOptions] = useState(
        knownClients.map(c => ({ value: c, label: c }))
    )
    const [serviceOptions, setServiceOptions] = useState(
        services.map(s => ({
            value: s.id,
            label: `${s.name} (AED ${s.total_amount})`,
            service: s
        }))
    )

    const [formData, setFormData] = useState({
        invoice_number: initialData?.invoice_number || nextInvoiceNumber,
        date: initialData?.date || new Date().toISOString().split('T')[0],
        client_name: initialData?.client_name || '',
        amount: initialData?.amount || 0,
        paid: initialData?.paid || 0,
        amount_due: initialData?.amount_due || 0,
        profit: initialData?.profit || 0,
        commission: initialData?.commission || 0,
        status: initialData?.status || 'Unpaid',
        hidden_remarks: initialData?.hidden_remarks || '',
        invoice_description: initialData?.invoice_description || ''
    })

    const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.line_items || [])
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [newClientMobile, setNewClientMobile] = useState('')
    const [newClientEmail, setNewClientEmail] = useState('')

    const isNewClient = formData.client_name && !knownClients.includes(formData.client_name)

    // Aggregate line items into totals
    useEffect(() => {
        let totalAmount = 0
        let totalGovt = 0
        let totalService = 0

        lineItems.forEach(item => {
            totalAmount += item.total
            totalGovt += item.govt_charge * item.qty
            totalService += item.service_charge * item.qty
        })

        setFormData(prev => ({
            ...prev,
            amount: totalAmount,
            commission: totalGovt,
            profit: totalService,
            invoice_description: lineItems.map(item => item.name).join(', ')
        }))
    }, [lineItems])

    useEffect(() => {
        const due = formData.amount - formData.paid
        const newDue = due < 0 ? 0 : due

        let newStatus = formData.status
        if (formData.amount > 0) {
            if (formData.paid >= formData.amount) newStatus = 'Paid'
            else if (formData.paid > 0) newStatus = 'Partially Paid'
            else newStatus = 'Unpaid'
        }

        setFormData(prev => ({
            ...prev,
            amount_due: newDue,
            status: newStatus as any
        }))
    }, [formData.amount, formData.paid])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (lineItems.length === 0) {
            toast.error('Please add at least one service to the invoice.')
            return
        }

        setLoading(true)

        try {
            if (formData.client_name && !knownClients.includes(formData.client_name)) {
                await addClientAction(formData.client_name, newClientMobile, newClientEmail)
            }

            const url = isEdit ? `/api/invoices/${initialData?.id}` : `/api/invoices`
            const method = isEdit ? 'PUT' : 'POST'

            const finalData = {
                ...formData,
                line_items: lineItems
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            })

            const responseData = await res.json()

            if (!res.ok) {
                throw new Error(responseData.error || 'Failed to save')
            }

            toast.success(isEdit ? 'Invoice updated!' : 'Invoice created!')
            router.push('/dashboard')
            router.refresh()
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(error.message || 'Failed to save invoice')
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target

        // Handle numeric fields
        if (['paid'].includes(name)) {
            const val = parseFloat(value) || 0
            setFormData(prev => ({
                ...prev,
                paid: val,
                amount_due: Math.max(0, (prev.amount as number) - val)
            }))
            return
        }

        // Handle string/enum fields
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleServiceSelect = (id: string) => {
        setSelectedServiceId(id)
        if (!id) return

        const service = serviceOptions.find(o => o.value === id)?.service
        if (service) {
            const newItem: LineItem = {
                id: crypto.randomUUID(),
                service_id: service.id,
                name: service.name,
                qty: 1,
                rate: service.total_amount,
                govt_charge: service.govt_charge,
                service_charge: service.service_charge,
                total: service.total_amount
            }
            setLineItems(prev => [...prev, newItem])
            setSelectedServiceId('') // Reset select after adding
        }
    }

    const removeLineItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id))
    }

    const updateLineItem = (id: string, updates: Partial<LineItem>) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item
            const updated = { ...item, ...updates }

            if ('govt_charge' in updates || 'service_charge' in updates) {
                updated.rate = (updated.govt_charge || 0) + (updated.service_charge || 0)
            } else if ('rate' in updates) {
                updated.service_charge = (updated.rate || 0) - (updated.govt_charge || 0)
            }

            // Recalculate total for this item
            const rate = updated.rate || 0
            const qty = updated.qty || 1
            updated.total = rate * qty

            return updated
        }))
    }

    const handleServiceCreate = async (inputValue: string) => {
        setLoading(true)
        try {
            const newService = await addService({
                name: inputValue,
                govt_charge: formData.commission,
                service_charge: formData.profit,
                total_amount: formData.amount
            })

            if (newService) {
                const newItem: LineItem = {
                    id: crypto.randomUUID(),
                    service_id: newService.id,
                    name: newService.name,
                    qty: 1,
                    rate: newService.total_amount,
                    govt_charge: newService.govt_charge,
                    service_charge: newService.service_charge,
                    total: newService.total_amount
                }
                const newOption = {
                    value: newService.id,
                    label: `${newService.name} (AED ${newService.total_amount})`,
                    service: newService
                }
                setServiceOptions(prev => [...prev, newOption])
                setLineItems(prev => [...prev, newItem])
                setSelectedServiceId('')
                toast.success(`Service "${inputValue}" saved to predefined list.`)
            }
        } catch (e) {
            toast.error('Failed to save predefined service')
        }
        setLoading(false)
    }

    const handleClientCreate = async (inputValue: string) => {
        const newOption = { label: inputValue, value: inputValue }
        setClientOptions(prev => [...prev, newOption])
        setFormData(prev => ({ ...prev, client_name: inputValue }))
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-neutral-100">
                <h2 className="text-3xl font-black tracking-tight text-zinc-950">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 flex items-center gap-2 transition-colors bg-[#FAFAFA] px-4 py-2 rounded-full border border-neutral-200">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Invoice Number <span className="text-rose-500">*</span></label>
                    <input required type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all" placeholder="INV-001" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Date <span className="text-rose-500">*</span></label>
                    <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all" />
                </div>

                <div className="md:col-span-2 relative z-30">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Client Name <span className="text-rose-500">*</span></label>
                    <CreatableSelect
                        isClearable
                        isDisabled={loading}
                        isLoading={loading}
                        onChange={(newValue: any) => {
                            setFormData(prev => ({ ...prev, client_name: newValue?.value || '' }))
                        }}
                        onCreateOption={handleClientCreate}
                        options={clientOptions}
                        value={formData.client_name ? { label: formData.client_name, value: formData.client_name } : null}
                        isSearchable
                        placeholder="Search or type client name..."
                        styles={{
                            control: (base) => ({
                                ...base,
                                minHeight: '48px',
                                borderRadius: '9999px',
                                borderColor: '#e5e5e5',
                                padding: '0 12px',
                                '&:hover': { borderColor: '#09090b' },
                                boxShadow: 'none',
                                zIndex: 30
                            }),
                            singleValue: (base) => ({
                                ...base,
                                color: '#09090b',
                                fontWeight: '600'
                            }),
                            input: (base) => ({
                                ...base,
                                color: '#09090b'
                            }),
                            placeholder: (base) => ({
                                ...base,
                                color: '#a1a1aa'
                            })
                        }}
                    />
                </div>

                {isNewClient && (
                    <div className="md:col-span-2 bg-[#FAFAFA] p-6 rounded-3xl border border-neutral-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">New Client Mobile <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    type="text"
                                    value={newClientMobile}
                                    onChange={e => setNewClientMobile(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium transition-all bg-white shadow-sm"
                                    placeholder="e.g. +971 50 123 4567"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">New Client Email <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    type="email"
                                    value={newClientEmail}
                                    onChange={e => setNewClientEmail(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium transition-all bg-white shadow-sm"
                                    placeholder="client@example.com"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 font-bold italic tracking-wide">* This info will be automatically added to the clients directory.</p>
                    </div>
                )}

                <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2">
                        <label className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em]">Selected Services <span className="text-rose-500">*</span></label>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{lineItems.length} Items</span>
                    </div>

                    {lineItems.length === 0 ? (
                        <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-3xl p-10 text-center mb-6">
                            <Plus className="h-8 w-8 text-neutral-200 mx-auto mb-3" />
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">At least one service is required</p>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-6">
                            {lineItems.map((item, idx) => (
                                <div key={item.id} className="bg-white border border-neutral-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                                        <div className="h-8 w-8 bg-zinc-950 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={e => updateLineItem(item.id, { name: e.target.value })}
                                                className="w-full text-zinc-950 font-black tracking-tight outline-none border-b border-transparent focus:border-zinc-950/20 pb-1"
                                                placeholder="Service name..."
                                            />
                                            <input
                                                type="text"
                                                value={item.description || ''}
                                                onChange={e => updateLineItem(item.id, { description: e.target.value })}
                                                className="w-full text-zinc-500 text-sm outline-none border-b border-transparent focus:border-zinc-300 pb-0.5 mt-1 italic"
                                                placeholder="Description (optional, shown on invoice)..."
                                            />
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Qty</label>
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={e => updateLineItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                                                        className="w-14 bg-zinc-100 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white border border-transparent focus:border-zinc-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Rate</label>
                                                    <input
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={e => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                                        className="w-20 bg-zinc-100 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white border border-transparent focus:border-zinc-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wide">Govt</label>
                                                    <input
                                                        type="number"
                                                        value={item.govt_charge}
                                                        onChange={e => updateLineItem(item.id, { govt_charge: parseFloat(e.target.value) || 0 })}
                                                        className="w-20 bg-blue-50 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Srvc</label>
                                                    <input
                                                        type="number"
                                                        value={item.service_charge}
                                                        onChange={e => updateLineItem(item.id, { service_charge: parseFloat(e.target.value) || 0 })}
                                                        className="w-20 bg-emerald-50 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white border border-transparent focus:border-emerald-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-end gap-1 sm:gap-2">
                                            <span className="text-sm font-black text-zinc-950">AED {item.total.toLocaleString()}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeLineItem(item.id)}
                                                className="text-zinc-300 hover:text-rose-500 transition-colors sm:p-1"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-zinc-50 p-6 rounded-3xl border border-neutral-200 mb-8 relative z-20">
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Add Service from Predefined List</label>
                        <CreatableSelect
                            isClearable
                            isDisabled={loading}
                            isLoading={loading}
                            className="text-zinc-950 font-medium"
                            placeholder="Search predefined services..."
                            options={serviceOptions}
                            value={null} // Keep it null so it resets after adding
                            onChange={(option: any) => {
                                handleServiceSelect(option?.value || '')
                            }}
                            onCreateOption={handleServiceCreate}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    minHeight: '48px',
                                    borderRadius: '9999px',
                                    borderColor: '#e5e5e5',
                                    padding: '0 12px',
                                    backgroundColor: 'white',
                                    '&:hover': { borderColor: '#09090b' },
                                    boxShadow: 'none'
                                }),
                                menu: (base) => ({
                                    ...base,
                                    zIndex: 50
                                }),
                                singleValue: (base) => ({
                                    ...base,
                                    color: '#09090b',
                                    fontWeight: '600'
                                }),
                                input: (base) => ({
                                    ...base,
                                    color: '#09090b'
                                }),
                                placeholder: (base) => ({
                                    ...base,
                                    color: '#a1a1aa'
                                })
                            }}
                        />
                        <p className="text-[10px] text-zinc-500 mt-3 font-bold uppercase tracking-widest">Selecting a service adds it to the list above.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Govt Charge (AED)</label>
                    <input readOnly type="number" name="commission" value={formData.commission} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-medium" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Service Charge (AED)</label>
                    <input readOnly type="number" name="profit" value={formData.profit} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-medium" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Billed Amount (AED)</label>
                    <input readOnly type="number" name="amount" value={formData.amount} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-black" placeholder="0" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Amount Paid (AED) <span className="text-rose-500">*</span></label>
                    <input required type="number" name="paid" value={formData.paid} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none transition-all font-medium" placeholder="0" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Remaining Balance (AED)</label>
                    <input readOnly type="number" name="amount_due" value={formData.amount_due} className="w-full border border-neutral-100 rounded-full py-3 px-5 outline-none bg-zinc-100 cursor-not-allowed font-black text-zinc-950" />
                </div>

                <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Payment Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none appearance-none bg-white font-black text-zinc-950 uppercase tracking-widest text-[10px]">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Invoice Summary <span className="text-zinc-300 normal-case font-medium tracking-normal">(editable — auto-filled from services)</span></label>
                    <textarea name="invoice_description" value={formData.invoice_description} onChange={handleChange} rows={2} className="w-full border border-neutral-200 bg-white rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium text-zinc-700 text-sm transition-all resize-none" placeholder="e.g. TAWJEEH, DAMAN, BATHAKKA FEE" />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">Hidden Remarks <span className="bg-zinc-100 px-2 py-0.5 rounded-full text-[10px] text-zinc-500">Dashboard Only</span></label>
                    <textarea name="hidden_remarks" value={formData.hidden_remarks} onChange={handleChange} rows={2} className="w-full border border-neutral-200 bg-neutral-50 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all resize-none" placeholder="Internal notes not visible on PDF..." />
                </div>
            </div>

            <div className="mt-10 flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-sm font-black text-white bg-zinc-950 hover:bg-zinc-800 hover:-translate-y-0.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-950 disabled:opacity-50 transition-all cursor-pointer"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isEdit ? 'Save Changes' : 'Create Invoice'}
                </button>
            </div>
        </form>
    )
}
