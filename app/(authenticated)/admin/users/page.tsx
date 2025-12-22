"use client"

import { useEffect, useState, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { isAdmin } from "@/lib/adminUtils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import EditUserDialog from "@/components/admin/EditUserDialog"
import CreateUserModal from "@/components/admin/CreateUserModal"

export default function AdminManagementPage() {
    const { user, profile, isLoading } = useAuth()
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [fetchingUsers, setFetchingUsers] = useState(true)

    // Wrap fetch in useCallback so it can be passed to the modal to refresh the list
    const fetchUsers = useCallback(async () => {
        setFetchingUsers(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true })

        if (!error) setAllUsers(data || [])
        setFetchingUsers(false)
    }, [])

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push("/login")
                return
            }

            if (!isAdmin(profile?.position)) {
                router.push("/dashboard")
                return
            }

            fetchUsers()
        }
    }, [user, profile, isLoading, router, fetchUsers])

    if (isLoading || fetchingUsers) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-sm font-medium text-muted-foreground">
                    Loading User Management...
                </div>
            </div>
        )
    }

    return (
        <div className="p-10 max-w-6xl mx-auto">
            {/* BACK BUTTON */}
            <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="mb-6 pl-0 hover:bg-transparent hover:text-primary transition-colors"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>

            {/* HEADER SECTION */}
            <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">
                        View all system users and manage their security credentials.
                    </p>
                </div>

                {/* MODAL WITH REFRESH CALLBACK */}
                <CreateUserModal onUserCreated={fetchUsers} />
            </div>

            {/* TABLE SECTION */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[250px]">Full Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allUsers.length > 0 ? (
                            allUsers.map((u) => (
                                <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {u.full_name || "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                                            {u.position || "Staff"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <EditUserDialog
                                                user={{
                                                    id: u.id,
                                                    full_name: u.full_name,
                                                    email: u.email,
                                                    position: u.position
                                                }}
                                                onUserUpdated={fetchUsers}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                    No users found in the system.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}