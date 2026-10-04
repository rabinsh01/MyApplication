import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getInvoicePayments, createInvoicePayment } from '@/lib/fs-db'
import { createClient } from '@/utils/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const payments = await getInvoicePayments(id)
        return NextResponse.json(payments)
    } catch (error: any) {
        console.error('Error in GET /api/invoices/[id]/payments:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch payments' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await request.json()

        const amount = Number(body.amount) || 0
        const payment_date = body.payment_date || new Date().toISOString().split('T')[0]
        const payment_method = body.payment_method || 'Cash'
        const notes = body.notes || ''

        if (amount <= 0) {
            return NextResponse.json({ error: 'Payment amount must be greater than 0.' }, { status: 400 })
        }

        // Fetch invoice total directly — avoids triggering auto-migration side effects inside getInvoice()
        const { data: invoiceRow, error: invoiceErr } = await supabase
            .from('invoices')
            .select('id, amount')
            .eq('id', id)
            .single()

        if (invoiceErr || !invoiceRow) {
            console.error('Invoice lookup error:', invoiceErr)
            return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
        }

        // Sum existing payments directly from DB
        const { data: existingPayments, error: paymentsErr } = await supabase
            .from('invoice_payments')
            .select('amount')
            .eq('invoice_id', id)

        if (paymentsErr) {
            console.error('Payments lookup error:', paymentsErr)
            return NextResponse.json({ error: 'Failed to fetch existing payments.' }, { status: 500 })
        }

        const currentTotalPaid = (existingPayments || []).reduce(
            (sum: number, p: any) => sum + Number(p.amount || 0), 0
        )
        const remainingBalance = Math.max(0, Number(invoiceRow.amount) - currentTotalPaid)

        if (remainingBalance <= 0) {
            return NextResponse.json({ error: 'This invoice is already fully paid.' }, { status: 400 })
        }

        if (amount > remainingBalance + 0.001) {
            return NextResponse.json({
                error: `Payment amount cannot exceed the remaining balance of AED ${remainingBalance.toFixed(2)}.`
            }, { status: 400 })
        }

        const newPayment = await createInvoicePayment({
            invoice_id: id,
            payment_date,
            amount,
            payment_method,
            notes
        })

        revalidatePath('/dashboard')
        revalidatePath(`/dashboard/edit/${id}`)
        revalidatePath('/dashboard/clients')
        revalidatePath('/dashboard/clients/[name]', 'page')

        return NextResponse.json(newPayment, { status: 201 })
    } catch (error: any) {
        console.error('Error in POST /api/invoices/[id]/payments:', error)
        return NextResponse.json({ error: error.message || 'Failed to add payment' }, { status: 500 })
    }
}
