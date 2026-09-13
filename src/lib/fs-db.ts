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
    return data as Invoice
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
