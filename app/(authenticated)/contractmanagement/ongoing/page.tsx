import { redirect } from 'next/navigation'

export default function OngoingPage() {
    redirect('/contractmanagement?tab=ongoing')
}