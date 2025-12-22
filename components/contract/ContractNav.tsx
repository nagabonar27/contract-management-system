"use client"

import { cn } from "@/lib/utils"

interface ContractNavProps {
    activeTab: string
    onTabChange: (tab: string) => void
}

export function ContractNav({ activeTab, onTabChange }: ContractNavProps) {
    const links = [
        { id: "ongoing", label: "Ongoing Contracts" },
        { id: "active", label: "Active Contracts" },
        { id: "expiring", label: "Expiring Soon" },
        { id: "expired", label: "Expired Contracts" },
        { id: "finished", label: "Finished Contracts" },
        { id: "performance", label: "Performance" }, // Keep Performance as link?
    ]

    return (
        <nav className="flex gap-4 border-b pb-2 mb-4 overflow-x-auto">
            {links.map((link) => {
                if (link.id === 'performance') {
                    // Performance might still be a separate page if it's very different?
                    // Implementation plan said "Refactor Contract Management to Single Page View".
                    // The user said "on conttract mnagement ongoing active expiring expired finished".
                    // Performance was not explicitly mentioned but it is in the nav.
                    // For now, I will treat 'Performance' as a redirect or keep it as a Link if separate.
                    // But to be safe and consistent, let's keep it as a Link for now if we didn't refactor it.
                    // However, to keep UI consistent, if I change others to buttons...
                    // Let's assume Performance is still a separate route for now as I haven't extracted it.
                    return (
                        <a
                            key={link.id}
                            href="/contractmanagement/performance"
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                                "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {link.label}
                        </a>
                    )
                }

                const isActive = activeTab === link.id
                return (
                    <button
                        key={link.id}
                        onClick={() => onTabChange(link.id)}
                        className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {link.label}
                    </button>
                )
            })}
        </nav>
    )
}
