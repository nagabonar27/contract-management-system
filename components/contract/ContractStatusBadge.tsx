import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ContractStatusBadgeProps {
    status: string
    className?: string
}

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
    const getVariant = (s: string) => {
        const normalized = s?.toLowerCase() || ''

        switch (normalized) {
            case 'active':
                return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
            case 'expired':
                return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
            case 'completed':
            case 'finished':
                return "bg-black text-white hover:bg-gray-800 border-transparent"
            case 'on progress':
            case 'draft':
                return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
            case 'ready to finalize':
                return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100"
        }
    }

    return (
        <Badge
            variant="outline"
            className={cn(getVariant(status), "whitespace-nowrap", className)}
        >
            {status || 'Unknown'}
        </Badge>
    )
}
