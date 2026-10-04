import { createClient } from '@/utils/supabase/server'

export interface LineItem {
    id: string
    service_id?: string
    name: string
    description?: string
    qty: number
    rate: number
    govt_charge: number
    service_charge: number
    total: number
}

export interface InvoicePayment {
    id: string
    invoice_id: string
    payment_date: string
    amount: number
    payment_method: 'Cash' | 'Card' | 'Bank Transfer' | 'Online' | 'Other'
    notes?: string
    created_at?: string
    updated_at?: string
}

export interface Invoice {
    id: string
    invoice_number: string
    date: string
    client_name: string
    amount: number
    paid: number
    amount_due: number
    profit: number
    commission: number
    status: 'Paid' | 'Partially Paid' | 'Unpaid'
    created_by: string
    hidden_remarks?: string
    invoice_description?: string
    line_items?: LineItem[]
    payments?: InvoicePayment[]
    is_deleted: boolean
    created_at: string
}

export interface Service {
    id: string
    name: string
    total_amount: number
    govt_charge: number
    service_charge: number
    created_at: string
}

export interface Client {
    id: string
    name: string
    mobile?: string
    email?: string
    created_at?: string
}

export async function getInvoices(includeDeleted = false): Promise<Invoice[]> {
    const supabase = await createClient()
    let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

    if (!includeDeleted) {
        query = query.eq('is_deleted', false)
    }

    const { data, error } = await query
    if (error) {
        console.error('Error fetching invoices:', error)
        return []
    }
    return (data as Invoice[]) || []
}

export async function getInvoice(id: string): Promise<Invoice | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) return null

    const invoice = data as Invoice
    let payments = await getInvoicePayments(id)

    // Auto-migrate existing invoice paid amount if no payments exist yet
    if ((!payments || payments.length === 0) && Number(invoice.paid) > 0) {
        try {
            const initPayment = await createInvoicePayment({
                invoice_id: id,
                payment_date: invoice.date || new Date().toISOString().split('T')[0],
                amount: Number(invoice.paid),
                payment_method: 'Other',
                notes: 'Initial Payment'
            })
            payments = [initPayment]
        } catch (e) {
            console.error('Auto-seeding initial payment record failed:', e)
        }
    }

    invoice.payments = payments

    if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        const amountDue = Math.max(0, invoice.amount - totalPaid)
        let status: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid'
        if (invoice.amount > 0) {
            if (totalPaid >= invoice.amount) status = 'Paid'
            else if (totalPaid > 0) status = 'Partially Paid'
        }
        invoice.paid = totalPaid
        invoice.amount_due = amountDue
        invoice.status = status
    }

    return invoice
}

export async function createInvoice(data: Omit<Invoice, 'id' | 'created_at' | 'is_deleted'>): Promise<Invoice> {
    const supabase = await createClient()
    const id = crypto.randomUUID()

    const newInvoice = {
        ...data,
        id,
        is_deleted: false,
    }

    const { data: inserted, error } = await supabase
        .from('invoices')
        .insert(newInvoice)
        .select()
        .single()

    if (error) {
        console.error('Supabase error in createInvoice:', error)
        throw new Error(error.message)
    }
    return inserted as Invoice
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Supabase error in updateInvoice:', error)
        throw new Error(error.message)
    }
    if (!data) throw new Error('Invoice not found')
    return data as Invoice
}

export async function deleteInvoice(id: string): Promise<boolean> {
    const updated = await updateInvoice(id, { is_deleted: true })
    return updated !== null
}

// -------------------------------------------------------------
// Services CRUD
// -------------------------------------------------------------

export async function getServices(): Promise<Service[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching services:', error)
        return []
    }
    return (data as Service[]) || []
}

export async function createService(data: Omit<Service, 'id' | 'created_at'>): Promise<Service> {
    const supabase = await createClient()
    const id = crypto.randomUUID()

    const { data: inserted, error } = await supabase
        .from('services')
        .insert({ ...data, id })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return inserted as Service
}

export async function updateService(id: string, updates: Partial<Service>): Promise<Service | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error || !data) return null
    return data as Service
}

export async function deleteService(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

    return !error
}

// -------------------------------------------------------------
// Clients CRUD
// -------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
    const supabase = await createClient()
    const { data } = await supabase.from('clients').select('*').order('name')
    return data || []
}

export async function createClientRecord(name: string, mobile?: string, email?: string): Promise<Client | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('clients')
        .insert({ name, mobile, email })
        .select()
        .single()

    if (error) {
        console.error('Error creating client:', error)
        return null
    }
    return data
}

export async function deleteClientRecord(name: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('name', name)

    if (error) {
        console.error('Error deleting client:', error)
        return false
    }
    return true
}

export async function updateClientRecord(name: string, updates: { name?: string, mobile?: string, email?: string }): Promise<Client | null> {
    const supabase = await createClient()
    
    // 1. Update the client record
    const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('name', name)
        .select()
        .single()

    if (error) {
        console.error('Error updating client:', error)
        return null
    }

    // 2. If name was changed, sync all invoices with the new name
    if (updates.name && updates.name !== name) {
        const { error: invoiceError } = await supabase
            .from('invoices')
            .update({ client_name: updates.name })
            .eq('client_name', name)
        
        if (invoiceError) {
            console.error('Error syncing invoices after client rename:', invoiceError)
            // We don't return null here because the client was already updated, 
            // but we log the error for diagnostics.
        }
    }

    return data
}

// -------------------------------------------------------------
// Invoice Payments CRUD
// -------------------------------------------------------------

export async function getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: true })
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching payments:', error)
        return []
    }
    return (data as InvoicePayment[]) || []
}

export async function recalculateInvoiceTotals(invoiceId: string): Promise<{ totalPaid: number; amountDue: number; status: 'Paid' | 'Partially Paid' | 'Unpaid' }> {
    const supabase = await createClient()

    // 1. Fetch invoice total amount
    const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('amount')
        .eq('id', invoiceId)
        .single()

    if (invErr || !inv) {
        throw new Error('Invoice not found for recalculation')
    }

    const totalAmount = Number(inv.amount) || 0

    // 2. Sum payments
    const payments = await getInvoicePayments(invoiceId)
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const amountDue = Math.max(0, totalAmount - totalPaid)

    let status: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid'
    if (totalAmount > 0) {
        if (totalPaid >= totalAmount) status = 'Paid'
        else if (totalPaid > 0) status = 'Partially Paid'
        else status = 'Unpaid'
    }

    // 3. Update invoices table
    await supabase
        .from('invoices')
        .update({
            paid: totalPaid,
            amount_due: amountDue,
            status: status
        })
        .eq('id', invoiceId)

    return { totalPaid, amountDue, status }
}

export async function createInvoicePayment(data: Omit<InvoicePayment, 'id' | 'created_at' | 'updated_at'>): Promise<InvoicePayment> {
    const supabase = await createClient()
    const id = crypto.randomUUID()

    const { data: inserted, error } = await supabase
        .from('invoice_payments')
        .insert({
            ...data,
            id,
            updated_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating payment:', error)
        throw new Error(error.message)
    }

    // Automatically recalculate invoice totals
    await recalculateInvoiceTotals(data.invoice_id)

    return inserted as InvoicePayment
}

export async function updateInvoicePayment(id: string, updates: Partial<InvoicePayment>): Promise<InvoicePayment | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('invoice_payments')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error || !data) {
        console.error('Error updating payment:', error)
        return null
    }

    // Automatically recalculate invoice totals
    if (data.invoice_id) {
        await recalculateInvoiceTotals(data.invoice_id)
    }

    return data as InvoicePayment
}

export async function deleteInvoicePayment(id: string, invoiceId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting payment:', error)
        return false
    }

    // Automatically recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId)

    return true
}
