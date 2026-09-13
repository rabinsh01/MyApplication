import InvoiceTable from '@/components/InvoiceTable'
import { getInvoices } from '@/lib/fs-db'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ClientDetailsPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params
    const decodedName = decodeURIComponent(name)

    // Fetch all invoices and filter for this client exactly
    // In a real huge app we'd do a supabase .eq('client_name', decodedName)
    // but we can reuse the generic getInvoices for now since it's a small app.
    const allInvoices = await getInvoices()
    const clientInvoices = allInvoices.filter(inv => inv.client_name === decodedName)

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-neutral-100">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
                        <Link href="/dashboard/clients" className="hover:text-zinc-950 transition-colors">Directory</Link>
                        <span>/</span>
                        <span className="text-zinc-950">Partner Profile</span>
                    </div>
                    <h2 className="text-3xl font-black text-zinc-950 flex items-center gap-3 tracking-tighter">
                        <div className="h-10 w-10 bg-zinc-950 rounded-full flex items-center justify-center text-white text-sm">
                            {decodedName.charAt(0).toUpperCase()}
                        </div>
                        {decodedName}
                    </h2>
                </div>
                <Link href="/dashboard/clients" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-950 border border-neutral-200 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-50 transition-all shadow-sm">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
                </Link>
            </div>

            <InvoiceTable initialInvoices={clientInvoices} />
        </div>
    )
}
