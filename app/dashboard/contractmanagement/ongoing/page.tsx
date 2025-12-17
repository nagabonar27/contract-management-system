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
import { ContractNav } from "@/components/contract/ContractNav"

type ContractTable = {
    id: string
    title: string
    contract_number: string | null
    status: string
    current_step: string | null
    contract_type_id: number | null
    contract_types: { name: string } | null
    created_at: string
    updated_at: string
    category: string | null
    user_name: string | null
    parent_contract_id: string | null
    contract_bid_agenda: { step_name: string; end_date: string | null }[]
    division: string | null
}

const getCurrentStep = (agenda: { step_name: string; end_date: string | null }[]) => {
    if (!agenda || agenda.length === 0) return null
    // Find the first step that doesn't have an end_date
    const current = agenda.find(step => !step.end_date)
    return current ? current.step_name : "Completed"
}

export default function OngoingContractsPage() {
    const [tasks, setTasks] = useState<ContractTable[]>([])
    const [loading, setLoading] = useState(true)

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
                    contract_type_id,
                    created_at,
                    updated_at,
                    category,
                    division,
                    parent_contract_id,
                    contract_types ( name ),
                    profiles:created_by ( full_name ),
                    contract_bid_agenda ( step_name, end_date )
                `)
                .order('created_at', { ascending: false })

            if (error) {
                // ... error handling
            } else {
                console.log("Fetched contracts data:", data)
                const formattedData: ContractTable[] = (data || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    contract_number: item.contract_number,
                    status: item.status,
                    current_step: getCurrentStep(item.contract_bid_agenda),
                    contract_type_id: item.contract_type_id,
                    contract_types: item.contract_types,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    category: item.category,
                    division: item.division,
                    user_name: item.profiles?.full_name,
                    parent_contract_id: item.parent_contract_id,
                    contract_bid_agenda: item.contract_bid_agenda
                }))
                setTasks(formattedData)
            }
        } catch (error) {
            console.error("Error fetching tasks:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this contract?")) return
        const { error } = await supabase.from('contracts').delete().eq('id', id)
        if (error) {
            alert("Error deleting contract: " + error.message)
        } else {
            setTasks(prev => prev.filter(t => t.id !== id))
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Ongoing Contracts</h1>
                    <p className="text-muted-foreground">
                        Here's a list of all ongoing contracts and their current status.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/contractmanagement/ongoing/create">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Contract
                        </Link>
                    </Button>
                </div>
            </div>

            <ContractNav />

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contract Name</TableHead>
                            <TableHead>Contract No.</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Division</TableHead>
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
                                <TableCell colSpan={11} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center">
                                    No contracts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow key={task.id}>
                                    <TableCell className="font-medium">{task.title}</TableCell>
                                    <TableCell>{task.contract_number || '-'}</TableCell>
                                    <TableCell>{task.user_name || '-'}</TableCell>
                                    <TableCell>{task.division || '-'}</TableCell>
                                    <TableCell>{task.category || '-'}</TableCell>
                                    <TableCell>
                                        {task.parent_contract_id
                                            ? "Amendment"
                                            : (task.contract_types?.name || '-')
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={task.status === 'On Progress' ? "secondary" : task.status === 'Active' ? "default" : "outline"}>
                                            {task.status === 'Active' ? 'Completed' : task.status} {/* User asked to return 'Completed' if active/complete */}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={task.current_step || undefined}>
                                        <Link href={`/dashboard/contractmanagement/ongoing/${task.id}`} className="hover:underline">
                                            {task.current_step || <span className="text-muted-foreground italic text-xs">Not started</span>}
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
                                                    <Link href={`/dashboard/contractmanagement/ongoing/${task.id}`}>
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
                                </TableRow >
                            ))
                        )
                        }
                    </TableBody >
                </Table >
            </div >
        </div >
    )
}