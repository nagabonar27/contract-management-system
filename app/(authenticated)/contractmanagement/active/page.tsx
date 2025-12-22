import { redirect } from 'next/navigation'

export default function ActivePage() {
    redirect('/contractmanagement?tab=active')
}
