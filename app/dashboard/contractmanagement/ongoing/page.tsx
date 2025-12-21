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
import { supabase } from "@/lib/supabaseClient"
import { ContractNav } from "@/components/contract/ContractNav"
import { calculatePriceDifference, formatCurrency } from "@/lib/contractUtils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PlusCircle } from "lucide-react"

const PALETTE_COLORS = [
    '#3b82f6', // blue-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#a855f7', // purple-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f59e0b', // amber-500
    '#6366f1', // indigo-500
    '#6b7280', // gray-500
]

const DIVISION_COLOR_MAP: Record<string, string> = {
    'TECH': '#3b82f6', // blue
    'HRGA': '#ec4899', // pink
    'FIN': '#10b981',  // emerald
    'LGL': '#a855f7',  // purple
    'PROC': '#f97316', // orange
    'OPS': '#06b6d4',  // cyan
    'EXT': '#84cc16',  // lime
    'PLNT': '#f59e0b', // amber
    'MGMT': '#6366f1', // indigo
}

const getColorForString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALETTE_COLORS.length;
    return PALETTE_COLORS[index];
}

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
    contract_bid_agenda: { step_name: string; start_date: string | null; end_date: string | null; updated_at: string; remarks: string | null }[]
    division: string | null
    current_step_db: string | null
    appointed_vendor: string | null
    contract_vendors: {
        vendor_name: string
        price_note: string | null
        revised_price_note: string | null
    }[]
    version: number

    department: string | null
}

const getCurrentStep = (agenda: { step_name: string; start_date: string | null; end_date: string | null; updated_at: string }[]) => {
    if (!agenda || agenda.length === 0) return null

    // Sort by start_date descending. If no start_date, fallback to updated_at
    const sortedAgenda = [...agenda].sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0 // Prioritize steps with dates
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
        if (dateA !== dateB) return dateB - dateA // Descending date

        // Tie-breaker: updated_at descending
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

    return sortedAgenda[0].step_name
}

const getAppointedVendor = (agenda: { step_name: string; remarks: string | null }[]) => {
    const appointedStep = agenda.find(step => step.step_name === "Appointed Vendor")
    return appointedStep?.remarks || null
}

export default function OngoingContractsPage() {
    const [tasks, setTasks] = useState<ContractTable[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const router = useRouter()



    const fetchTasks = async () => {
        try {
            setLoading(true)
            setErrorMsg(null)
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
                    current_step,
                    category,
                    division,
                    parent_contract_id,
                    version,

                    department,
                    contract_types ( name ),
                    profiles:profiles!contracts_created_by_profile_fkey ( full_name ),
                    contract_bid_agenda ( step_name, start_date, end_date, updated_at, remarks ),
                    contract_vendors ( vendor_name, price_note, revised_price_note )
                `)
                .neq('status', 'Active') // Excluding Active as it appears as "Completed" in this context
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Supabase Error:", error)
                setErrorMsg(error.message + " | Details: " + JSON.stringify(error))
            } else {

                const formattedData: ContractTable[] = (data || []).map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    contract_number: item.contract_number,
                    status: item.status,
                    current_step: getCurrentStep(item.contract_bid_agenda) || item.current_step || "Not started",
                    contract_type_id: item.contract_type_id,
                    contract_types: item.contract_types,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    current_step_db: item.current_step,
                    category: item.category,
                    division: item.division,
                    user_name: item.profiles?.full_name,
                    parent_contract_id: item.parent_contract_id,
                    contract_bid_agenda: item.contract_bid_agenda,
                    contract_vendors: item.contract_vendors,
                    appointed_vendor: getAppointedVendor(item.contract_bid_agenda),
                    version: item.version,

                    department: item.department
                }))
                setTasks(formattedData)
            }
        } catch (error: any) {
            console.error("Error fetching tasks:", error)
            setErrorMsg(error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])



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

            {/* Visualizations - Recharts */}
            {
                (() => {
                    const countBy = (arr: ContractTable[], key: keyof ContractTable) => {
                        const counts: Record<string, number> = {}
                        arr.forEach(t => {
                            const val = String(t[key] || 'Unassigned')
                            counts[val] = (counts[val] || 0) + 1
                        })
                        return Object.entries(counts).map(([name, value]) => ({ name, value }))
                    }

                    const userData = countBy(tasks, 'user_name')
                    const divisionData = countBy(tasks, 'division')
                    const categoryData = countBy(tasks, 'category')

                    const renderPieChart = (title: string, data: { name: string; value: number }[], colorStrategy: 'division' | 'hash' = 'hash') => (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    {data.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {data.map((entry, index) => {
                                                        let color = PALETTE_COLORS[index % PALETTE_COLORS.length]
                                                        if (colorStrategy === 'division') {
                                                            color = DIVISION_COLOR_MAP[entry.name] || getColorForString(entry.name)
                                                        } else {
                                                            color = getColorForString(entry.name)
                                                        }
                                                        return <Cell key={`cell-${index}`} fill={color} />
                                                    })}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            No data available
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )

                    return (
                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            {renderPieChart("Contracts by User", userData, 'hash')}
                            {renderPieChart("Contracts by Division", divisionData, 'division')}
                            {renderPieChart("Contracts by Category", categoryData, 'hash')}
                        </div>
                    )
                })()
            }

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contract Name</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Contract Value</TableHead>
                            <TableHead>Cost Saving</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current Step</TableHead>
                            <TableHead>Created Date</TableHead>
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
                        ) : errorMsg ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center text-red-500">
                                    Error loading data: {errorMsg}
                                </TableCell>
                            </TableRow>
                        ) : tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    No contracts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => {
                                const isAmendment = task.parent_contract_id !== null || task.title.toLowerCase().includes('amendment')
                                const getDivisionColor = (div: string | null) => {
                                    switch (div) {
                                        case 'TECH': return 'bg-blue-100 text-blue-800 border-blue-200'
                                        case 'HRGA': return 'bg-pink-100 text-pink-800 border-pink-200'
                                        case 'FIN': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                        case 'LGL': return 'bg-purple-100 text-purple-800 border-purple-200'
                                        case 'PROC': return 'bg-orange-100 text-orange-800 border-orange-200'
                                        case 'OPS': return 'bg-cyan-100 text-cyan-800 border-cyan-200'
                                        case 'EXT': return 'bg-lime-100 text-lime-800 border-lime-200'
                                        case 'PLNT': return 'bg-amber-100 text-amber-800 border-amber-200'
                                        case 'MGMT': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        default: return 'bg-gray-100 text-gray-800 border-gray-200'
                                    }
                                }

                                return (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {task.title}
                                                {isAmendment && (
                                                    <Badge variant="outline" className={getDivisionColor('Amendment') + " bg-violet-100 text-violet-800 border-violet-200 text-xs"}>
                                                        Amendment
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{task.appointed_vendor || '-'}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const vendor = task.contract_vendors?.find(v => v.vendor_name === task.appointed_vendor)
                                                const finalPrice = vendor?.revised_price_note || vendor?.price_note
                                                return finalPrice ? `Rp ${finalPrice}` : '-'
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const vendor = task.contract_vendors?.find(v => v.vendor_name === task.appointed_vendor)
                                                const originalPrice = vendor?.price_note
                                                const revisedPrice = vendor?.revised_price_note

                                                if (originalPrice && revisedPrice) {
                                                    const { difference, isSaving } = calculatePriceDifference(originalPrice, revisedPrice)
                                                    if (isSaving && difference > 0) {
                                                        return (
                                                            <span className="text-green-600 font-medium">
                                                                {formatCurrency(difference)}
                                                            </span>
                                                        )
                                                    }
                                                }
                                                return '-'
                                            })()}
                                        </TableCell>
                                        <TableCell>{task.user_name || '-'}</TableCell>
                                        <TableCell>
                                            {task.division ? (
                                                <Badge variant="outline" className={getDivisionColor(task.division)}>
                                                    {task.division}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{task.category || '-'}</TableCell>
                                        <TableCell>
                                            {(task.contract_types?.name || '-')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={task.status === 'On Progress' ? "secondary" : "outline"}>
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={task.current_step || undefined}>
                                            <Link href={`/dashboard/contractmanagement/ongoing/${task.id}`} className="hover:underline">
                                                {task.current_step || <span className="text-muted-foreground italic text-xs">Not started</span>}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/contractmanagement/ongoing/${task.id}`}>
                                                            Open
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this contract?')) {
                                                                supabase.from('contracts').delete().eq('id', task.id).then(() => fetchTasks());
                                                            }
                                                        }}
                                                        className="text-red-600"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow >
                                )
                            })
                        )
                        }
                    </TableBody >
                </Table >
            </div >


        </div >
    )
}