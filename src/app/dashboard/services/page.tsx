import { getServices } from '@/lib/fs-db'
import ServiceManager from '@/components/ServiceManager'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
    const services = await getServices()

    return (
        <div>
            <ServiceManager initialServices={services} />
        </div>
    )
}
