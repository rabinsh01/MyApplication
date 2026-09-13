import InvoiceForm from '@/components/InvoiceForm'
import { getInvoices, getServices, getClients } from '@/lib/fs-db'

export default async function CreateInvoicePage() {
    const invoices = await getInvoices()
    const services = await getServices()
    const dbClients = await getClients()

    // Merge DB clients with any legacy clients found in existing invoices
    const uniqueClients = Array.from(new Set([
        ...dbClients.map(c => c.name),
        ...invoices.map((i: any) => i.client_name)
    ].filter(Boolean))).sort()

    let maxNumber = 0

    invoices.forEach((inv: any) => {
        const numMatch = inv.invoice_number.match(/(\d+)$/)
        if (numMatch) {
            const num = parseInt(numMatch[1], 10)
            if (num > maxNumber) maxNumber = num
        }
    })

    // Always use Biznet/ prefix going forward
    const nextInvoiceNumber = maxNumber > 0 ? `Biznet/${maxNumber + 1}` : `Biznet/1001`

    return (
        <div className="py-2">
            <InvoiceForm knownClients={uniqueClients as string[]} nextInvoiceNumber={nextInvoiceNumber} services={services} />
        </div>
    )
}
