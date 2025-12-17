"use client"


import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, ChevronsUpDown, User as UserIcon, FileText, Newspaper } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

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
    const userEmail = user?.email || ""

    // Prefer profile name, otherwise format email, otherwise "User"
    const displayName = profile?.full_name ||
        (userEmail ? userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1) : "User")

    // position
    const displayPosition = profile?.position || ""

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <div className="flex h-screen w-full bg-muted/40">

            <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="flex h-14 items-center border-b px-6 font-semibold lg:h-[60px]">
                    Contract Management System
                </div>

                <nav className="flex-1 overflow-auto py-4">
                    <div className="px-4 grid gap-1">
                        {/* 1 dashboard */}
                        <Link
                            href="/dashboard"
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${pathname === "/dashboard"
                                ? "bg-muted text-primary"
                                : "text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </Link>

                        {/* 2 contract management */}
                        <Link
                            href="/dashboard/contractmanagement/ongoing"
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${pathname.startsWith("/dashboard/contractmanagement/ongoing")
                                ? "bg-muted text-primary"
                                : "text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            {/* Using a different icon to distinguish it */}
                            <Newspaper className="h-4 w-4" />
                            Contract Management
                        </Link>
                    </div>
                </nav>




                {/* user profile  */}
                <div className="mt-auto p-4 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full h-auto p-2 justify-start hover:bg-muted">
                                <div className="flex items-center gap-3 w-full">

                                    <Avatar className="h-9 w-9 border">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {displayName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col items-start text-left text-sm flex-1 overflow-hidden">
                                        {/* NAME */}
                                        <span className="font-semibold truncate w-full">
                                            {displayName}
                                        </span>

                                        {/* POSITION (New!) */}
                                        <span className="text-xs font-medium text-blue-600 truncate w-full">
                                            {displayPosition}
                                        </span>

                                        {/* EMAIL */}
                                        <span className="text-[10px] text-muted-foreground truncate w-full">
                                            {userEmail}
                                        </span>
                                    </div>

                                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
                                </div>
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {userEmail}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
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

            </aside>

            <div className="flex flex-col flex-1">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                    <h1 className="text-lg font-semibold">Overview</h1>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}