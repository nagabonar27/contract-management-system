import { redirect } from 'next/navigation'

export default function ExpiringPage() {
    redirect('/contractmanagement?tab=expiring')
}
