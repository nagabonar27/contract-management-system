import { redirect } from 'next/navigation'

export default function FinishedPage() {
    redirect('/contractmanagement?tab=finished')
}
