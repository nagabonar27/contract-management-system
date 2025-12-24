"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useQuery } from "@tanstack/react-query"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MoreVertical,
    Eye,
    PlusCircle,
    Trash2,
    FileEdit,
    Search
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, getDivisionColor, getColorForString } from "@/lib/contractUtils"
import { format } from "date-fns"
import CreateContractSheet from "@/components/contract/CreateContractSheet"
import { ContractService } from "@/services/contractService"
import { InteractivePieChart } from "@/components/charts/InteractivePieChart"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ContractBadges } from "@/components/contract/ContractBadges"

// --- CONSTANTS & TYPES ---

const PALETTE_COLORS = [
    "#2563eb", // Blue
    "#16a34a", // Green
    "#dc2626", // Red
    "#ca8a04", // Yellow
    "#9333ea", // Purple
    "#0891b2", // Cyan
    "#ea580c", // Orange
    "#4f46e5", // Indigo
]


interface ContractTable {
    id: string
    title: string
    contract_number: string
    start_date: string // created_at
    status: string
    contract_value: number
    cost_savings: number
    division: string | null
    department: string | null
    contract_type_name: string | null // Joined
    category: string | null // Joined
    appointed_vendor: string | null
    current_step: string
    is_cr: boolean
    is_on_hold: boolean
    is_anticipated: boolean
    parent_contract_id: string | null
    user_name: string | null // PIC
    contract_bid_agenda?: {
        step_name: string
        status: string
        updated_at: string
    }[]
    version: number
}

// Helper for color coding (same as PerformancePage)


export function OngoingContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()

    // State
    // Tasks managed by Query
    const [filteredTasks, setFilteredTasks] = useState<ContractTable[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    // Chart Data State
    const [divisionData, setDivisionData] = useState<{ name: string, value: number, fill: string }[]>([])
    const [statusData, setStatusData] = useState<{ name: string, value: number, fill: string }[]>([])

    // REACT QUERY
    const { data: tasks = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['ongoingContracts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('contract_versions')
                .select(`
                    id, 
                    title, 
                    version,
                    created_at, 
                    updated_at,
                    status,
                    final_contract_amount,
                    cost_saving,
                    division,
                    department,
                    category,
                    appointed_vendor,
                    current_step,
                    is_cr,
                    is_on_hold,
                    is_anticipated,
                    parent_id,
                    parent:parent_id (
                        contract_number,
                        created_at,
                        profiles:created_by (full_name)
                    ),
                    contract_types (name),
                    contract_bid_agenda:contract_bid_agenda(step_name, status, updated_at),
                    contract_vendors(vendor_name, is_appointed)
                `)
                .neq('status', 'Completed')
                .neq('status', 'Finished')
                .neq('status', 'Active')
                .eq('is_current', true)
                .order('updated_at', { ascending: false })

            if (error) throw error

            return (data || []).map((item: any) => {
                const parent = item.parent || {}
                const vendors = item.contract_vendors || []
                const appointedVendor = vendors.find((v: any) => v.is_appointed)?.vendor_name

                return {
                    id: item.id, // Version ID
                    title: item.title,
                    version: item.version,
                    contract_number: parent.contract_number,
                    start_date: parent.created_at || item.created_at,
                    status: item.status,
                    contract_value: item.final_contract_amount || 0,
                    cost_savings: item.cost_saving || 0,
                    division: item.division,
                    department: item.department,
                    contract_type_name: item.contract_types?.name,
                    category: item.category,
                    appointed_vendor: appointedVendor || null,
                    current_step: item.current_step || "Initiated",
                    is_cr: item.is_cr || false,
                    is_on_hold: item.is_on_hold || false,
                    is_anticipated: item.is_anticipated || false,
                    parent_contract_id: item.parent_id,
                    user_name: parent.profiles?.full_name,
                    contract_bid_agenda: item.contract_bid_agenda
                }
            })
        }
    })

    // Filter Logic
    useEffect(() => {
        if (!searchTerm) {
            setFilteredTasks(tasks)
        } else {
            const lower = searchTerm.toLowerCase()
            setFilteredTasks(tasks.filter(t =>
                t.title?.toLowerCase().includes(lower) ||
                t.contract_number?.toLowerCase().includes(lower) ||
                t.appointed_vendor?.toLowerCase().includes(lower) ||
                t.user_name?.toLowerCase().includes(lower)
            ))
        }
    }, [searchTerm, tasks])

    // Update charts when tasks change
    useEffect(() => {
        if (!tasks.length) return

        // Division Data
        const divCounts: Record<string, number> = {}
        tasks.forEach(t => {
            const d = t.division || "Unknown"
            divCounts[d] = (divCounts[d] || 0) + 1
        })
        const divChartForGraph = Object.entries(divCounts).map(([name, value]) => ({
            name,
            value,
            fill: getColorForString(name)
        }))

        setDivisionData(divChartForGraph)

        // Status Data (or Type?)
        // Let's do Category.
        const catCounts: Record<string, number> = {}
        tasks.forEach(t => {
            const c = t.category || "General"
            catCounts[c] = (catCounts[c] || 0) + 1
        })
        const catChart = Object.entries(catCounts).map(([name, value], i) => ({
            name,
            value,
            fill: PALETTE_COLORS[i % PALETTE_COLORS.length]
        }))
        setStatusData(catChart)

    }, [tasks])

    const handleDeleteClick = (id: string) => {
        setDeleteId(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!deleteId) return

        try {
            // UPDATE: Use Service to handle cleanup (parent text, etc.)
            await ContractService.deleteContract(supabase, deleteId)

            toast.success("Contract deleted successfully")

            // REACT QUERY: Invalidate to refetch
            refetch()

            // Filter update handled by useEffect reacting to tasks change (which happens after refetch)

        } catch (error: any) {
            toast.error("Failed to delete contract", { description: error.message })
        } finally {
            setIsDeleteDialogOpen(false)
            setDeleteId(null)
        }
    }

    const handleRowClick = (id: string) => {
        router.push(`/bid-agenda/${id}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Ongoing Contracts</h2>
                    <p className="text-muted-foreground">Manage contracts currently in progress</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        New Contract
                    </Button>
                </div>
                <CreateContractSheet
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    onSuccess={() => {
                        setIsCreateOpen(false)
                        refetch()
                    }}
                />
            </div>

            {/* Visualizations - Optional, based on state */}
            {tasks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InteractivePieChart
                        title="Contracts by Division"
                        description="Distribution across departments"
                        data={divisionData}
                        label="Contracts"
                    />
                    <InteractivePieChart
                        title="Contracts by Category"
                        description="Distribution by procurement category"
                        data={statusData}
                        label="Contracts"
                    />
                </div>
            )}

            {/* Search Input */}
            <div className="flex items-center space-x-2">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Contract Name</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Contract Value</TableHead>
                            <TableHead>Cost Saving</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current Step</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : filteredTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">No ongoing contracts found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredTasks.map((task) => (
                                <TableRow
                                    key={task.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(task.id)}
                                >


                                    <TableCell className="font-medium">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span>{task.title}</span>
                                                <ContractBadges
                                                    isAmendment={task.title?.toLowerCase().includes("amendment") || (task.version > 1) || task.contract_type_name?.includes("Amendment")}
                                                    isCR={task.is_cr}
                                                    isOnHold={task.is_on_hold}
                                                    isAnticipated={task.is_anticipated}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{task.contract_number}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{task.appointed_vendor || "-"}</TableCell>
                                    <TableCell>{task.contract_value > 0 ? formatCurrency(task.contract_value) : "-"}</TableCell>
                                    <TableCell>{task.cost_savings > 0 ? formatCurrency(task.cost_savings) : "-"}</TableCell>
                                    <TableCell>{task.user_name || "-"}</TableCell>
                                    <TableCell>
                                        {task.division && (
                                            <Badge
                                                variant="secondary"
                                                className={`text-[10px] px-1 py-0 h-5 border ${getDivisionColor(task.division)}`}
                                            >
                                                {task.division}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {task.contract_type_name?.replace("Amendment", "") || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <ContractStatusBadge status={task.status} />
                                            <span className="text-xs text-muted-foreground">
                                                Start: {task.start_date ? format(new Date(task.start_date), 'dd MMM yyyy') : '-'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{task.current_step}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/bid-agenda/${task.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Open Bid Agenda
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(task.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the contract and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
