import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePdf } from '@/lib/pdf-generator'
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

    const { id } = await params
    const pdfBytes = await generateInvoicePdf(id)

    if (!pdfBytes) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice-${id}.pdf"`,
        },
    })
}
