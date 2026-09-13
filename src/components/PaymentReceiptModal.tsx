'use client'

import React from 'react'
import { Invoice, InvoicePayment } from '@/lib/fs-db'
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react'

interface Props {
    invoice: Invoice
    payment?: InvoicePayment
    onClose: () => void
}

export default function PaymentReceiptModal({ invoice, payment, onClose }: Props) {
    const payments = invoice.payments || []
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const amountDue = Math.max(0, invoice.amount - totalPaid)

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-neutral-200 relative print:shadow-none print:border-none print:max-w-none print:w-full">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-neutral-100 print:hidden">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-zinc-950" />
                        <h3 className="text-lg font-black text-zinc-950 tracking-tight">
                            {payment ? 'Payment Receipt' : 'Payment History Summary'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-zinc-950 rounded-full hover:bg-zinc-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Printable Content */}
                <div className="py-6 space-y-6">
                    {/* Top Branding */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-black text-zinc-950 tracking-tight">BIZNET BUSINESSMEN SERVICES</h2>
                            <p className="text-xs text-zinc-500 font-medium mt-1">AL AIN, SANAYIA, UAE · +971 568304427</p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest rounded-full border border-emerald-100">
                                PAYMENT RECEIPT
                            </span>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100 grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[10px]">Invoice Number</span>
                            <span className="font-black text-zinc-950 text-sm">{invoice.invoice_number}</span>
                        </div>
                        <div>
                            <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[10px]">Client Name</span>
                            <span className="font-black text-zinc-950 text-sm">{invoice.client_name}</span>
                        </div>
                        {payment && (
                            <>
                                <div>
                                    <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[10px]">Payment Date</span>
                                    <span className="font-bold text-zinc-800">{payment.payment_date}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[10px]">Payment Method</span>
                                    <span className="font-bold text-zinc-800">{payment.payment_method}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Highlighted Payment Amount (if single payment) */}
                    {payment && (
                        <div className="bg-zinc-950 text-white rounded-2xl p-5 flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Amount Paid</span>
                                <span className="text-2xl font-black tracking-tight">AED {Number(payment.amount).toFixed(2)}</span>
                            </div>
                            {payment.notes && (
                                <div className="text-right max-w-[180px]">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">Notes</span>
                                    <span className="text-xs text-zinc-200 truncate block">{payment.notes}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* All Payments Table (if summary or multiple) */}
                    {!payment && payments.length > 0 && (
                        <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-50 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-neutral-100">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Method</th>
                                        <th className="p-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 font-medium">
                                    {payments.map(p => (
                                        <tr key={p.id}>
                                            <td className="p-3 text-zinc-800 font-bold">{p.payment_date}</td>
                                            <td className="p-3 text-zinc-600">{p.payment_method}</td>
                                            <td className="p-3 text-right font-black text-zinc-950">AED {Number(p.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary Totals */}
                    <div className="border-t border-neutral-200 pt-4 space-y-2 text-xs font-bold">
                        <div className="flex justify-between text-zinc-500">
                            <span>Total Invoice Amount:</span>
                            <span className="text-zinc-950 font-black">AED {Number(invoice.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600">
                            <span>Total Paid To Date:</span>
                            <span className="font-black">AED {totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600">
                            <span>Remaining Balance:</span>
                            <span className="font-black">AED {amountDue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-neutral-100 text-sm">
                            <span className="font-black text-zinc-950">Payment Status:</span>
                            <span className={`font-black uppercase tracking-wider text-xs px-3 py-1 rounded-full ${
                                invoice.status === 'Paid' || amountDue === 0
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : invoice.status === 'Partially Paid' || totalPaid > 0
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                            }`}>
                                {amountDue === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-6 border-t border-neutral-100 flex justify-end gap-3 print:hidden">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-500 hover:text-zinc-950 hover:bg-neutral-100 transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2.5 rounded-full text-xs font-black text-white bg-zinc-950 hover:bg-zinc-800 shadow-md inline-flex items-center gap-2 transition-all"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    )
}
