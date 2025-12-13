"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, FileText, Trash, PlusCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

type ContractTable = {
    id: string
    title: string
    contract_number: string | null
    status: string
    current_step: string
    contract_type_id: number | null
    contract_types: { name: string } | null
    created_at: string
    updated_at: string
    category: string | null
    user_name: string | null
}

export default function OngoingContractsPage() {
    const [tasks, setTasks] = useState<ContractTable[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    title, 
                    contract_number,
                    status, 
                    current_step, 
                    contract_type_id,
                    created_at,
                    updated_at,
                    category,
                    contract_types ( name ),
                    profiles:created_by ( full_name )
                `)
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Error fetching tasks:", error)
                alert("Error loading contracts: " + error.message)
            } else {
                console.log("Fetched contracts data:", data)
                const formattedData: ContractTable[] = (data || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    contract_number: item.contract_number,
                    status: item.status,
                    current_step: item.current_step,
                    contract_type_id: item.contract_type_id,
                    contract_types: item.contract_types,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    category: item.category,
                    user_name: item.profiles?.full_name
                }))
                console.log("Formatted data:", formattedData)
                setTasks(formattedData)
            }
        } catch (err) {
            console.error("Unexpected error:", err)
            alert("Unexpected error loading contracts")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contract? This action cannot be undone and will remove all agenda items and vendor data.")) return

        try {
            // Software Cascade Delete
            // 1. Delete Agenda Items
            const { error: agendaError } = await supabase.from('contract_bid_agenda').delete().eq('contract_id', id)
            if (agendaError) throw new Error("Failed to delete agenda items: " + agendaError.message)

            // 2. Delete Vendors (and their notes)
            const { error: vendorError } = await supabase.from('contract_vendors').delete().eq('contract_id', id)
            if (vendorError) throw new Error("Failed to delete vendors: " + vendorError.message)

            // 3. Delete Contract
            const { error: contractError } = await supabase.from('contracts').delete().eq('id', id)
            if (contractError) throw new Error("Failed to delete contract: " + contractError.message)

            // Update UI
            setTasks(tasks.filter(t => t.id !== id))
        } catch (error: any) {
            alert(error.message)
            console.error(error)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Ongoing Contracts</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/ongoing/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Contract
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contract Name</TableHead>
                            <TableHead>Contract No.</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current Step</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead>Updated Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    No contracts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/ongoing/${task.id}`} className="hover:underline text-blue-600">
                                            {task.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{task.contract_number || '-'}</TableCell>
                                    <TableCell>{task.user_name || '-'}</TableCell>
                                    <TableCell>{task.category || '-'}</TableCell>
                                    <TableCell>{task.contract_types?.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={task.status === 'On Progress' ? "secondary" : task.status === 'Active' ? "default" : "outline"}>
                                            {task.status === 'Active' ? 'Completed' : task.status} {/* User asked to return 'Completed' if active/complete */}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={task.current_step}>
                                        <Link href={`/dashboard/ongoing/${task.id}`} className="hover:underline">
                                            {task.current_step || '-'}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(task.updated_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/ongoing/${task.id}`}>
                                                        <FileText className="mr-2 h-4 w-4" /> Open
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(task.id)}>
                                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}