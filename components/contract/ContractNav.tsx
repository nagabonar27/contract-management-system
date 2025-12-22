"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function ContractNav() {
    const pathname = usePathname()

    const links = [
        { href: "/contractmanagement/ongoing", label: "Ongoing Contracts" },
        { href: "/contractmanagement/active", label: "Active Contracts" },
        { href: "/contractmanagement/expiring", label: "Expiring Soon" },
        { href: "/contractmanagement/expired", label: "Expired Contracts" },
        { href: "/contractmanagement/finished", label: "Finished Contracts" },
        { href: "/contractmanagement/performance", label: "Performance" },
    ]

    return (
        <nav className="flex gap-4 border-b pb-2 mb-4">
            {links.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {link.label}
                    </Link>
                )
            })}
        </nav>
    )
}
