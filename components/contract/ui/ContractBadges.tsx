import { Badge } from "@/components/ui/badge"

interface ContractBadgesProps {
    isAmendment?: boolean
    isCR?: boolean
    isOnHold?: boolean
    isAnticipated?: boolean
    className?: string
}

export function ContractBadges({
    isAmendment,
    isCR,
    isOnHold,
    isAnticipated,
    className = ""
}: ContractBadgesProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {isAmendment && (
                <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200 text-[10px] px-1 py-0 h-5">
                    Amendment
                </Badge>
            )}
            {isCR && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1 py-0 h-5">
                    CR
                </Badge>
            )}
            {isOnHold && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1 py-0 h-5">
                    On Hold
                </Badge>
            )}
            {isAnticipated && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-1 py-0 h-5">
                    Anticipated
                </Badge>
            )}
        </div>
    )
}
