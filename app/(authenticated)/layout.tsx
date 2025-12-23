"use client"

import { useState } from "react" // Add useState
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
    LayoutDashboard,
    LogOut,
    ChevronsUpDown,
    User as UserIcon,
    Newspaper,
    Users, // New Icon for User Management
    ChevronLeft, // Add ChevronLeft
    ChevronRight, // Add ChevronRight
    Menu, // Add Menu icon if needed for mobile, but focusing on collapse for now
    BarChart3 // Add BarChart3 icon
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { isAdmin } from "@/lib/adminUtils" // Import your utility

// UI Components
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils" // Ensure cn is imported or use template literals


// import hook
import { useAuth } from '@/context/AuthContext'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, profile } = useAuth()
    const supabase = createClientComponentClient() // Cookie-aware client
    const userEmail = user?.email || ""
    const [isCollapsed, setIsCollapsed] = useState(false) // Add state

    // Check if user is an admin or analyst
    const showAdminLinks = isAdmin(profile?.position)

    const displayName = profile?.full_name ||
        (userEmail ? userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1) : "User")

    const displayPosition = profile?.position || ""

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push("/login")
    }

    return (
        <div className="flex h-screen w-full bg-muted/40">
            <aside
                className={cn(
                    "hidden flex-col border-r bg-background sm:flex transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-[70px]" : "w-64"
                )}
            >
                <div className={cn(
                    "flex h-14 items-center border-b px-4 lg:h-[60px]",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {!isCollapsed && (
                        <div className="font-semibold truncate">
                            CMS
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="h-8 w-8"
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                <nav className="flex-1 overflow-auto py-4">
                    <div className="px-2 grid gap-1">
                        <p className="px-3 text-[10px] font-medium uppercase text-muted-foreground mb-2">Main Menu</p>

                        <Link
                            href="/dashboard"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                pathname === "/dashboard" ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Dashboard" : undefined}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            {!isCollapsed && <span>Dashboard</span>}
                        </Link>

                        <Link
                            href="/contractmanagement?tab=ongoing"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                                pathname.startsWith("/contractmanagement") ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Contract Management" : undefined}
                        >
                            <Newspaper className="h-4 w-4" />
                            {!isCollapsed && <span>Contract Management</span>}
                        </Link>

                        <Link
                            href="/performance"
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                pathname === "/performance" ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? "Performance" : undefined}
                        >
                            <BarChart3 className="h-4 w-4" />
                            {!isCollapsed && <span>Performance</span>}
                        </Link>

                        {/* --- ADMIN SECTION --- */}
                        {showAdminLinks && (
                            <>
                                {!isCollapsed && (
                                    <div className="mt-4 px-3 text-[10px] font-medium uppercase text-muted-foreground mb-2">System</div>
                                )}
                                <Link
                                    href="/admin/users"
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                        pathname.startsWith("/admin") ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                    title={isCollapsed ? "User Management" : undefined}
                                >
                                    <Users className="h-4 w-4" />
                                    {!isCollapsed && <span>User Management</span>}
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                <div className="mt-auto p-2 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className={cn(
                                "w-full h-auto p-2 hover:bg-muted",
                                isCollapsed ? "justify-center" : "justify-start"
                            )}>
                                <div className={cn("flex items-center gap-3 w-full", isCollapsed && "justify-center")}>
                                    <Avatar className="h-9 w-9 border shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {displayName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <>
                                            <div className="flex flex-col items-start text-left text-sm flex-1 overflow-hidden">
                                                <span className="font-semibold truncate w-full">{displayName}</span>
                                                <span className="text-xs font-medium text-blue-600 truncate w-full">{displayPosition}</span>
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
                                        </>
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/profile')}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside >

            <div className="flex flex-col flex-1">
                {/* Logic: Hide if it's a bid-agenda detail page (e.g. /bid-agenda/123) OR contract management page */}
                {(!pathname.includes('/bid-agenda/') && !pathname.includes('contractmanagement') || pathname.endsWith('/create')) && (
                    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                        <h1 className="text-lg font-semibold capitalize">
                            {pathname.split('/').pop()?.replace(/-/g, ' ')}
                        </h1>
                    </header>
                )}
                <main className="flex-1 overflow-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div >
    )
}