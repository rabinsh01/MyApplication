'use server'

import { createService, updateService as dbUpdateService, deleteService as dbDeleteService, Service } from '@/lib/fs-db'
import { revalidatePath } from 'next/cache'

export async function addService(data: Omit<Service, 'id' | 'created_at'>) {
    try {
        const newService = await createService(data)
        revalidatePath('/dashboard/services')
        revalidatePath('/dashboard/create')
        return newService
    } catch (e: any) {
        console.error('Add service error:', e)
        throw new Error(e.message)
    }
}

export async function updateService(id: string, data: Partial<Service>) {
    try {
        await dbUpdateService(id, data)
        revalidatePath('/dashboard/services')
        revalidatePath('/dashboard/create')
        return { success: true }
    } catch (e: any) {
        console.error('Update service error:', e)
        return { error: e.message }
    }
}

export async function deleteService(id: string) {
    try {
        await dbDeleteService(id)
        revalidatePath('/dashboard/services')
        revalidatePath('/dashboard/create')
        return { success: true }
    } catch (e: any) {
        console.error('Delete service error:', e)
        return { error: e.message }
    }
}
