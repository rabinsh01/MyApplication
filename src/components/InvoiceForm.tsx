'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Invoice, Service, InvoicePayment } from '@/lib/fs-db'
import { toast } from 'sonner'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { addClientAction } from '@/app/dashboard/clients/actions'
import { addService } from '@/app/dashboard/services/actions'
import { Loader2, Save, ArrowLeft, Plus, Trash2, Hash, CreditCard, Edit2, X, Printer } from 'lucide-react'
import Link from 'next/link'
import PaymentReceiptModal from './PaymentReceiptModal'

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
    const [payments, setPayments] = useState<InvoicePayment[]>(initialData?.payments || [])
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [newClientMobile, setNewClientMobile] = useState('')
    const [newClientEmail, setNewClientEmail] = useState('')

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [editingPayment, setEditingPayment] = useState<InvoicePayment | null>(null)
    const [paymentModalData, setPaymentModalData] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '' as number | string,
        payment_method: 'Cash' as 'Cash' | 'Card' | 'Bank Transfer' | 'Online' | 'Other',
        notes: ''
    })

    // Receipt Modal State
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [receiptPayment, setReceiptPayment] = useState<InvoicePayment | undefined>(undefined)

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

    // Calculate Total Paid and Remaining Balance from Payments
    const totalPaidFromPayments = useMemo(() => {
        if (!isEdit) return formData.paid
        // Always sum from payments array in edit mode (even if empty = 0)
        return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    }, [isEdit, payments, formData.paid])

    const remainingBalance = useMemo(() => {
        return Math.max(0, formData.amount - totalPaidFromPayments)
    }, [formData.amount, totalPaidFromPayments])

    const calculatedStatus = useMemo(() => {
        if (formData.amount <= 0) return 'Unpaid'
        if (totalPaidFromPayments >= formData.amount) return 'Paid'
        if (totalPaidFromPayments > 0) return 'Partially Paid'
        return 'Unpaid'
    }, [formData.amount, totalPaidFromPayments])

    // Keep formData synced with payment calculations
    useEffect(() => {
        if (isEdit) {
            setFormData(prev => ({
                ...prev,
                paid: totalPaidFromPayments,
                amount_due: remainingBalance,
                status: calculatedStatus as any
            }))
        } else {
            const due = Math.max(0, formData.amount - formData.paid)
            let newStatus = formData.status
            if (formData.amount > 0) {
                if (formData.paid >= formData.amount) newStatus = 'Paid'
                else if (formData.paid > 0) newStatus = 'Partially Paid'
                else newStatus = 'Unpaid'
            }
            setFormData(prev => ({
                ...prev,
                amount_due: due,
                status: newStatus as any
            }))
        }
    }, [isEdit, totalPaidFromPayments, remainingBalance, calculatedStatus, formData.amount, formData.paid])

    // Chronological order for payments (Oldest first)
    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => {
            if (a.payment_date !== b.payment_date) {
                return a.payment_date.localeCompare(b.payment_date)
            }
            return (a.created_at || '').localeCompare(b.created_at || '')
        })
    }, [payments])

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

        if (['paid'].includes(name)) {
            const val = parseFloat(value) || 0
            setFormData(prev => ({
                ...prev,
                paid: val,
                amount_due: Math.max(0, (prev.amount as number) - val)
            }))
            return
        }

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
            setSelectedServiceId('')
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

    // ── Payment Handlers ──
    const handleOpenAddPayment = () => {
        if (remainingBalance <= 0) {
            toast.error('This invoice is already fully paid.')
            return
        }
        setEditingPayment(null)
        setPaymentModalData({
            payment_date: new Date().toISOString().split('T')[0],
            amount: remainingBalance > 0 ? remainingBalance : '',
            payment_method: 'Cash',
            notes: ''
        })
        setIsPaymentModalOpen(true)
    }

    const handleOpenEditPayment = (p: InvoicePayment) => {
        setEditingPayment(p)
        setPaymentModalData({
            payment_date: p.payment_date,
            amount: p.amount,
            payment_method: p.payment_method,
            notes: p.notes || ''
        })
        setIsPaymentModalOpen(true)
    }

    const maxAllowedForModal = useMemo(() => {
        const otherPaymentsTotal = payments
            .filter(p => p.id !== editingPayment?.id)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0)
        return Math.max(0, formData.amount - otherPaymentsTotal)
    }, [payments, editingPayment, formData.amount])

    // Re-fetch fresh payments from server and sync local state
    const refreshPayments = async () => {
        if (!initialData?.id) return
        try {
            const res = await fetch(`/api/invoices/${initialData.id}/payments`, { cache: 'no-store' })
            if (res.ok) {
                const fresh: InvoicePayment[] = await res.json()
                setPayments(fresh)
            }
        } catch (err) {
            console.error('Failed to refresh payments:', err)
        }
    }

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = Number(paymentModalData.amount) || 0

        if (amt <= 0) {
            toast.error('Payment amount must be greater than 0.')
            return
        }

        if (amt > maxAllowedForModal + 0.001) {
            toast.error(`Payment amount cannot exceed the remaining balance of AED ${maxAllowedForModal.toFixed(2)}.`)
            return
        }

        setPaymentLoading(true)
        try {
            if (editingPayment) {
                const res = await fetch(`/api/invoices/${initialData?.id}/payments/${editingPayment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        payment_date: paymentModalData.payment_date,
                        amount: amt,
                        payment_method: paymentModalData.payment_method,
                        notes: paymentModalData.notes
                    })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Failed to update payment')
                toast.success('Payment updated successfully')
            } else {
                const res = await fetch(`/api/invoices/${initialData?.id}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        payment_date: paymentModalData.payment_date,
                        amount: amt,
                        payment_method: paymentModalData.payment_method,
                        notes: paymentModalData.notes
                    })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Failed to add payment')
                toast.success('Payment recorded successfully')
            }
            setIsPaymentModalOpen(false)
            // Re-fetch fresh payments from server to ensure UI is in sync
            await refreshPayments()
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || 'Failed to save payment')
        }
        setPaymentLoading(false)
    }

    const handleDeletePayment = async (p: InvoicePayment) => {
        if (!confirm(`Delete this payment of AED ${Number(p.amount).toFixed(2)}?`)) return

        try {
            const res = await fetch(`/api/invoices/${initialData?.id}/payments/${p.id}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete payment')
            }
            toast.success('Payment deleted successfully')
            // Re-fetch fresh payments from server to ensure UI is in sync
            await refreshPayments()
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete payment')
        }
    }

    return (
        <>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-white border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-neutral-100">
                <h2 className="text-3xl font-black tracking-tight text-zinc-950">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 flex items-center gap-2 transition-colors bg-[#FAFAFA] px-4 py-2 rounded-full border border-neutral-200">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div>
                    <label htmlFor="invoice-number" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Invoice Number <span className="text-rose-500">*</span></label>
                    <input required id="invoice-number" type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all" placeholder="INV-001" />
                </div>

                <div>
                    <label htmlFor="invoice-date" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Date <span className="text-rose-500">*</span></label>
                    <input required id="invoice-date" type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all" />
                </div>

                <div className="md:col-span-2 relative z-30">
                    <label htmlFor="client-name-select" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Client Name <span className="text-rose-500">*</span></label>
                    <CreatableSelect
                        inputId="client-name-select"
                        name="client_name_select"
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
                                <label htmlFor="new-client-mobile" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">New Client Mobile <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    id="new-client-mobile"
                                    name="new_client_mobile"
                                    type="text"
                                    value={newClientMobile}
                                    onChange={e => setNewClientMobile(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium transition-all bg-white shadow-sm"
                                    placeholder="e.g. +971 50 123 4567"
                                />
                            </div>
                            <div>
                                <label htmlFor="new-client-email" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">New Client Email <span className="text-neutral-300">(Optional)</span></label>
                                <input
                                    id="new-client-email"
                                    name="new_client_email"
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
                        <p className="text-[10px] font-black text-zinc-950 uppercase tracking-[0.2em]">Selected Services <span className="text-rose-500">*</span></p>
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
                                                id={`line-item-${item.id}-name`}
                                                name={`line_item_${item.id}_name`}
                                                aria-label="Service name"
                                                type="text"
                                                value={item.name}
                                                onChange={e => updateLineItem(item.id, { name: e.target.value })}
                                                className="w-full text-zinc-950 font-black tracking-tight outline-none border-b border-transparent focus:border-zinc-950/20 pb-1"
                                                placeholder="Service name..."
                                            />
                                            <input
                                                id={`line-item-${item.id}-description`}
                                                name={`line_item_${item.id}_description`}
                                                aria-label="Service description"
                                                type="text"
                                                value={item.description || ''}
                                                onChange={e => updateLineItem(item.id, { description: e.target.value })}
                                                className="w-full text-zinc-500 text-sm outline-none border-b border-transparent focus:border-zinc-300 pb-0.5 mt-1 italic"
                                                placeholder="Description (optional, shown on invoice)..."
                                            />
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <label htmlFor={`line-item-${item.id}-quantity`} className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Qty</label>
                                                    <input
                                                        id={`line-item-${item.id}-quantity`}
                                                        name={`line_item_${item.id}_quantity`}
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={e => updateLineItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                                                        className="w-14 bg-zinc-100 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white border border-transparent focus:border-zinc-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label htmlFor={`line-item-${item.id}-rate`} className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Rate</label>
                                                    <input
                                                        id={`line-item-${item.id}-rate`}
                                                        name={`line_item_${item.id}_rate`}
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={e => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                                        className="w-20 bg-zinc-100 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-zinc-950/20 focus:bg-white border border-transparent focus:border-zinc-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label htmlFor={`line-item-${item.id}-government-charge`} className="text-xs font-bold text-blue-500 uppercase tracking-wide">Govt</label>
                                                    <input
                                                        id={`line-item-${item.id}-government-charge`}
                                                        name={`line_item_${item.id}_government_charge`}
                                                        type="number"
                                                        value={item.govt_charge}
                                                        onChange={e => updateLineItem(item.id, { govt_charge: parseFloat(e.target.value) || 0 })}
                                                        className="w-20 bg-blue-50 rounded-full px-3 py-1 text-sm font-bold text-zinc-950 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-300"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <label htmlFor={`line-item-${item.id}-service-charge`} className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Srvc</label>
                                                    <input
                                                        id={`line-item-${item.id}-service-charge`}
                                                        name={`line_item_${item.id}_service_charge`}
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
                        <label htmlFor="service-select" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Add Service from Predefined List</label>
                        <CreatableSelect
                            inputId="service-select"
                            name="service_select"
                            isClearable
                            isDisabled={loading}
                            isLoading={loading}
                            className="text-zinc-950 font-medium"
                            placeholder="Search predefined services..."
                            options={serviceOptions}
                            value={null}
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
                    <label htmlFor="invoice-commission" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Govt Charge (AED)</label>
                    <input readOnly id="invoice-commission" type="number" name="commission" value={formData.commission} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-medium" />
                </div>

                <div>
                    <label htmlFor="invoice-profit" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Service Charge (AED)</label>
                    <input readOnly id="invoice-profit" type="number" name="profit" value={formData.profit} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-medium" />
                </div>

                <div>
                    <label htmlFor="invoice-amount" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Total Billed Amount (AED)</label>
                    <input readOnly id="invoice-amount" type="number" name="amount" value={formData.amount} className="w-full border border-neutral-200 rounded-full py-3 px-5 outline-none bg-[#FAFAFA] text-zinc-600 cursor-not-allowed font-black" placeholder="0" />
                </div>

                {!isEdit && (
                    <div>
                        <label htmlFor="invoice-paid" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Initial Amount Paid (AED)</label>
                        <input id="invoice-paid" type="number" name="paid" value={formData.paid} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none transition-all font-medium" placeholder="0" />
                    </div>
                )}

                <div>
                    <label htmlFor="invoice-amount-due" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Remaining Balance (AED)</label>
                    <input readOnly id="invoice-amount-due" type="number" name="amount_due" value={remainingBalance} className="w-full border border-neutral-100 rounded-full py-3 px-5 outline-none bg-zinc-100 cursor-not-allowed font-black text-zinc-950" />
                </div>

                <div>
                    <label htmlFor="invoice-status" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Payment Status</label>
                    <select id="invoice-status" disabled={isEdit} name="status" value={calculatedStatus} onChange={handleChange} className="w-full border border-neutral-200 rounded-full shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none appearance-none bg-white font-black text-zinc-950 uppercase tracking-widest text-[10px] disabled:bg-zinc-100 disabled:cursor-not-allowed">
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>

                {/* ── PAYMENT HISTORY SECTION (Edit Mode Only) ── */}
                {isEdit && (
                    <div className="md:col-span-2 border border-neutral-200 rounded-3xl p-6 sm:p-8 bg-[#FAFAFA] space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
                            <div>
                                <h3 className="text-lg font-black text-zinc-950 tracking-tight flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-zinc-950" />
                                    PAYMENT HISTORY
                                </h3>
                                <p className="text-xs text-zinc-500 font-medium">Record staged or partial payments for this invoice</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddPayment}
                                disabled={remainingBalance <= 0}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Add Payment
                            </button>
                        </div>

                        {/* Payments Table */}
                        <div className="overflow-x-auto border border-neutral-200 rounded-2xl bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
                                <thead className="bg-neutral-50 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">Date</th>
                                        <th scope="col" className="px-5 py-3">Amount</th>
                                        <th scope="col" className="px-5 py-3">Method</th>
                                        <th scope="col" className="px-5 py-3">Notes</th>
                                        <th scope="col" className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 font-medium text-zinc-950">
                                    {sortedPayments.length > 0 ? (
                                        sortedPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                                                <td className="px-5 py-3.5 whitespace-nowrap font-bold text-zinc-800">{p.payment_date}</td>
                                                <td className="px-5 py-3.5 whitespace-nowrap font-black text-emerald-600">AED {Number(p.amount).toFixed(2)}</td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-bold uppercase tracking-wider">
                                                        {p.payment_method}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-zinc-500 max-w-[200px] truncate">{p.notes || '-'}</td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setReceiptPayment(p); setIsReceiptOpen(true); }}
                                                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-blue-600 transition-colors"
                                                        title="View Receipt"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditPayment(p)}
                                                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 hover:text-zinc-950 transition-colors"
                                                        title="Edit Payment"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePayment(p)}
                                                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-rose-500 transition-colors"
                                                        title="Delete Payment"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 font-bold">
                                                No payments recorded yet. Click "+ Add Payment" above to add one.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center sm:text-left">
                            <div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Total Billed</span>
                                <span className="text-base font-black text-zinc-950">AED {formData.amount.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Total Paid</span>
                                <span className="text-base font-black text-emerald-600">AED {totalPaidFromPayments.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Remaining Balance</span>
                                <span className="text-base font-black text-rose-600">AED {remainingBalance.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Payment Status</span>
                                <span className={`inline-block mt-1 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${
                                    calculatedStatus === 'Paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : calculatedStatus === 'Partially Paid'
                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                    {calculatedStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="md:col-span-2">
                    <label htmlFor="invoice-description" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Invoice Summary <span className="text-zinc-300 normal-case font-medium tracking-normal">(editable — auto-filled from services)</span></label>
                    <textarea id="invoice-description" name="invoice_description" value={formData.invoice_description} onChange={handleChange} rows={2} className="w-full border border-neutral-200 bg-white rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium text-zinc-700 text-sm transition-all resize-none" placeholder="e.g. TAWJEEH, DAMAN, BATHAKKA FEE" />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="invoice-hidden-remarks" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">Hidden Remarks <span className="bg-zinc-100 px-2 py-0.5 rounded-full text-[10px] text-zinc-500">Dashboard Only</span></label>
                    <textarea id="invoice-hidden-remarks" name="hidden_remarks" value={formData.hidden_remarks} onChange={handleChange} rows={2} className="w-full border border-neutral-200 bg-neutral-50 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 py-3 px-5 outline-none font-medium transition-all resize-none" placeholder="Internal notes not visible on PDF..." />
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

            {/* ── ADD / EDIT PAYMENT MODAL ── */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-neutral-200 relative">
                        <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                            <h3 className="text-lg font-black text-zinc-950 tracking-tight">
                                {editingPayment ? 'Edit Payment' : 'Add Payment'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="p-2 text-zinc-400 hover:text-zinc-950 rounded-full hover:bg-zinc-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePayment} className="py-6 space-y-6 text-sm">
                            <div>
                                <label htmlFor="payment_date" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                                    Payment Date <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    id="payment_date"
                                    name="payment_date"
                                    type="date"
                                    value={paymentModalData.payment_date}
                                    onChange={e => setPaymentModalData(prev => ({ ...prev, payment_date: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="payment_amount" className="block text-xs font-black text-zinc-400 uppercase tracking-widest">
                                        Amount Paid (AED) <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] font-bold text-zinc-400">
                                        Max: AED {maxAllowedForModal.toFixed(2)}
                                    </span>
                                </div>
                                <input
                                    required
                                    id="payment_amount"
                                    name="payment_amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={maxAllowedForModal}
                                    value={paymentModalData.amount}
                                    onChange={e => setPaymentModalData(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-black text-zinc-950"
                                    placeholder="0.00"
                                    autoComplete="off"
                                />
                            </div>

                            <div>
                                <label htmlFor="payment_method" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                                    Payment Method <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    id="payment_method"
                                    name="payment_method"
                                    value={paymentModalData.payment_method}
                                    onChange={e => setPaymentModalData(prev => ({ ...prev, payment_method: e.target.value as any }))}
                                    className="w-full border border-neutral-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-bold text-zinc-950 bg-white"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Online">Online</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="payment_notes" className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                                    Notes <span className="text-neutral-300 font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    id="payment_notes"
                                    name="payment_notes"
                                    rows={2}
                                    value={paymentModalData.notes}
                                    onChange={e => setPaymentModalData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-950 font-medium text-zinc-700 resize-none"
                                    placeholder="e.g. Advance payment, Cheque #12345"
                                />
                            </div>

                            <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-500 hover:text-zinc-950 hover:bg-neutral-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paymentLoading}
                                    className="px-6 py-2.5 rounded-full text-xs font-black text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-md cursor-pointer"
                                >
                                    {paymentLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {editingPayment ? 'Save Payment' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── PAYMENT RECEIPT MODAL ── */}
            {isReceiptOpen && (
                <PaymentReceiptModal
                    invoice={{
                        ...formData,
                        id: initialData?.id || '',
                        created_by: initialData?.created_by || '',
                        is_deleted: false,
                        created_at: initialData?.created_at || '',
                        payments: payments
                    }}
                    payment={receiptPayment}
                    onClose={() => { setIsReceiptOpen(false); setReceiptPayment(undefined); }}
                />
            )}
        </>
    )
}
