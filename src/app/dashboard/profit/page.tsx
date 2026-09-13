import { getInvoices } from '@/lib/fs-db'
import ProfitClientView from '@/components/ProfitClientView'

export const dynamic = 'force-dynamic'

export default async function ProfitPage() {
    // Only get invoices that are not deleted
    const invoices = await getInvoices(false)

    return (
        <ProfitClientView initialInvoices={invoices} />
    )
}
