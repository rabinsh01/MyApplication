'use server'

import { createClientRecord, deleteClientRecord, updateClientRecord } from '@/lib/fs-db'
import { revalidatePath } from 'next/cache'

export async function addClientAction(name: string, mobile?: string, email?: string) {
    if (!name || name.trim() === '') {
        return { error: 'Invalid name' }
    }

    try {
        const client = await createClientRecord(name.trim(), mobile?.trim(), email?.trim())
        if (!client) {
            return { error: 'Failed to create client or client already exists.' }
        }
        revalidatePath('/dashboard/clients')
        revalidatePath('/dashboard/create')
        return { success: true, client }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteClientAction(name: string) {
    try {
        const success = await deleteClientRecord(name)
        if (!success) return { error: 'Failed to delete client.' }

        revalidatePath('/dashboard/clients')
        revalidatePath('/dashboard/create')
        revalidatePath('/dashboard/edit/[id]', 'page')

        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function editClientAction(name: string, updates: { name?: string, mobile?: string, email?: string }) {
    try {
        const client = await updateClientRecord(name, updates)
        if (!client) return { error: 'Failed to update client.' }

        revalidatePath('/dashboard/clients')
        revalidatePath('/dashboard/create')
        revalidatePath('/dashboard/edit/[id]', 'page')
        revalidatePath('/dashboard/clients/[name]', 'page')

        return { success: true, client }
    } catch (e: any) {
        return { error: e.message }
    }
}
