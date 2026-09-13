import InvoiceForm from '@/components/InvoiceForm'
import { getInvoice, getServices, getInvoices, getClients } from '@/lib/fs-db'
import { notFound } from 'next/navigation'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const invoice = await getInvoice(id)
    const services = await getServices()
    const invoices = await getInvoices()
    const dbClients = await getClients()

    if (!invoice) {
        notFound()
    }

    const uniqueClients = Array.from(new Set([
        ...dbClients.map(c => c.name),
        ...invoices.map((i: any) => i.client_name)
    ].filter(Boolean))).sort()

    return (
        <div className="py-2">
            <InvoiceForm initialData={invoice} isEdit services={services} knownClients={uniqueClients as string[]} />
        </div>
    )
}
