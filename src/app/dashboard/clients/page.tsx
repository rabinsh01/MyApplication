import { getInvoices, getClients } from '@/lib/fs-db'
import ClientHubManager from '@/components/ClientHubManager'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
    const invoices = await getInvoices()
    const dbClients = await getClients()

    // Map to store stats
    const statsMap = new Map<string, {
        name: string
        mobile?: string
        email?: string
        invoiceCount: number
        totalBilled: number
        totalPaid: number
        totalDue: number
        totalProfit: number
    }>()

    // Initialize map with explicit clients from DB
    dbClients.forEach(c => {
        statsMap.set(c.name, {
            name: c.name,
            mobile: c.mobile,
            email: c.email,
            invoiceCount: 0,
            totalBilled: 0,
            totalPaid: 0,
            totalDue: 0,
            totalProfit: 0
        })
    })

    // Update with invoice data
    invoices.forEach(inv => {
        if (!inv.client_name) return

        let stats = statsMap.get(inv.client_name)
        if (!stats) {
            // Case where client exists in invoices but not in clients table yet
            stats = {
                name: inv.client_name,
                invoiceCount: 0,
                totalBilled: 0,
                totalPaid: 0,
                totalDue: 0,
                totalProfit: 0
            }
            statsMap.set(inv.client_name, stats)
        }

        stats.invoiceCount += 1
        stats.totalBilled += inv.amount
        stats.totalPaid += inv.paid
        stats.totalDue += Math.max(0, inv.amount - inv.paid)
        stats.totalProfit += inv.profit
    })

    const allStats = Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <ClientHubManager initialClients={allStats} />
    )
}
