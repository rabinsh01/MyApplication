import { NextRequest, NextResponse } from 'next/server'
import { getInvoices, createInvoice } from '@/lib/fs-db'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const invoices = await getInvoices(includeDeleted)
    return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const data = await request.json()
        const newInvoice = await createInvoice({
            ...data,
            created_by: user.email,
        })
        return NextResponse.json(newInvoice, { status: 201 })
    } catch (error: any) {
        console.error('Error in POST /api/invoices:', error)
        return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 })
    }
}
