import { NextRequest, NextResponse } from 'next/server'
import { updateInvoice, deleteInvoice } from '@/lib/fs-db'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
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
        const updates = await request.json()
        const updatedInvoice = await updateInvoice(id, updates)

        if (!updatedInvoice) {
            return NextResponse.json({ error: 'Invoice not found or failed to update' }, { status: 404 })
        }

        return NextResponse.json(updatedInvoice)
    } catch (error: any) {
        console.error(`Error in PUT /api/invoices/${(await params).id}:`, error)
        return NextResponse.json({ error: error.message || 'Failed to update invoice' }, { status: 500 })
    }
}

export async function DELETE(
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
        const success = await deleteInvoice(id)

        if (!success) {
            return NextResponse.json({ error: 'Invoice not found or failed to delete' }, { status: 404 })
        }

        return NextResponse.json({ message: 'Deleted successfully' })
    } catch (error: any) {
        console.error(`Error in DELETE /api/invoices/${(await params).id}:`, error)
        return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 500 })
    }
}
