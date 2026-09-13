import { getInvoices } from '@/lib/fs-db'
import InvoiceTable from '@/components/InvoiceTable'

export default async function DashboardPage() {
    const invoices = await getInvoices(true) // fetch all, client filters deleted by default

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">Invoices</h2>
                <p className="mt-1 text-sm text-gray-500">Manage your invoices, track payments, and generate PDFs.</p>
            </div>

            <InvoiceTable initialInvoices={invoices} />
        </div>
    )
}
