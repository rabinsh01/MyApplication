import { NextRequest, NextResponse } from 'next/server'
import { getInvoice, updateInvoicePayment, deleteInvoicePayment } from '@/lib/fs-db'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id: invoiceId, paymentId } = await params
        const body = await request.json()

        const amount = Number(body.amount) || 0
        const payment_date = body.payment_date
        const payment_method = body.payment_method
        const notes = body.notes

        if (amount <= 0) {
            return NextResponse.json({ error: 'Payment amount must be greater than 0.' }, { status: 400 })
        }

        const invoice = await getInvoice(invoiceId)
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
        }

        const existingPayments = invoice.payments || []
        const currentPayment = existingPayments.find(p => p.id === paymentId)

        if (!currentPayment) {
            return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
        }

        // Exclude current payment's original amount from calculation
        const otherPaymentsTotal = existingPayments
            .filter(p => p.id !== paymentId)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0)

        const maxAllowed = Math.max(0, invoice.amount - otherPaymentsTotal)

        if (amount > maxAllowed + 0.001) {
            return NextResponse.json({
                error: `Payment amount cannot exceed the remaining balance of AED ${maxAllowed.toFixed(2)}.`
            }, { status: 400 })
        }

        const updated = await updateInvoicePayment(paymentId, {
            amount,
            payment_date,
            payment_method,
            notes
        })

        if (!updated) {
            return NextResponse.json({ error: 'Failed to update payment record' }, { status: 500 })
        }

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('Error in PUT /api/invoices/[id]/payments/[paymentId]:', error)
        return NextResponse.json({ error: error.message || 'Failed to update payment' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id: invoiceId, paymentId } = await params
        const success = await deleteInvoicePayment(paymentId, invoiceId)

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete payment record' }, { status: 404 })
        }

        return NextResponse.json({ message: 'Payment deleted successfully' })
    } catch (error: any) {
        console.error('Error in DELETE /api/invoices/[id]/payments/[paymentId]:', error)
        return NextResponse.json({ error: error.message || 'Failed to delete payment' }, { status: 500 })
    }
}
