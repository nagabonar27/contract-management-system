"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, Fragment, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContractNav } from "@/components/contract/ContractNav"
import { Badge } from "@/components/ui/badge"
import {
    BarChart3,
    TrendingUp,
    FileText,
    CalendarDays,
    Clock,
    Activity,
    Users,
    ChevronDownIcon,
    ChevronUpIcon
} from "lucide-react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from "recharts"
import { differenceInDays, parseISO } from "date-fns"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
    Row
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'

type ContractData = {
    id: string
    title: string
    contract_number: string
    status: string
    division: string | null
    created_at: string
    effective_date: string | null
    expiry_date: string | null
    version: number
    parent_contract_id: string | null
    final_contract_amount: number | null
    profiles: { full_name: string | null }[] | { full_name: string | null } | null
    contract_bid_agenda: { step_name: string; start_date: string | null; end_date: string | null }[]
    contract_vendors: {
        vendor_name: string
        is_appointed: boolean
        price_note: string | null
        revised_price_note: string | null
    }[]
}

type PicPerformance = {
    name: string
    total: number
    active: number
    onProgress: number
    completed: number
    divisions: Set<string>
    leadTimeSum: number
    leadTimeCount: number
}

// ... existing types

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { calculatePriceDifference, formatCurrency, getDivisionColor } from "@/lib/contractUtils"
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge"
import { format } from "date-fns"

export default function PerformancePage() {
    // ... existing component logic ...
    const supabase = createClientComponentClient()
    const [contracts, setContracts] = useState<ContractData[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('contract_versions')
                .select(`
                    id, 
                    title, 
                    status,
                    division,
                    created_at,
                    effective_date, 
                    expiry_date, 
                    version, 
                    parent_id,
                    final_contract_amount,
                    parent:parent_id(
                        contract_number,
                        created_at,
                        profiles:created_by (full_name)
                    ),
                    contract_bid_agenda ( step_name, start_date, end_date ),
                    contract_vendors ( vendor_name, is_appointed, price_note, revised_price_note )
                `)

            if (error) {
                console.error("Supabase Error:", error)
                throw error
            }

            const mappedData: ContractData[] = (data || []).map((c: any) => ({
                id: c.id,
                title: c.title,
                contract_number: c.parent?.contract_number || '-',
                status: c.status,
                division: c.division,
                created_at: c.parent?.created_at || c.created_at, // Fallback
                effective_date: c.effective_date,
                expiry_date: c.expiry_date,
                version: c.version,
                parent_contract_id: c.parent_id,
                final_contract_amount: c.final_contract_amount,
                profiles: c.parent?.profiles, // Map profiles from parent
                contract_bid_agenda: c.contract_bid_agenda || [],
                contract_vendors: c.contract_vendors || []
            }))

            setContracts(mappedData)
        } catch (error) {
            console.error("Error fetching performance data:", error)
        } finally {
            setLoading(false)
        }
    }

    // --- Metrics Calculations ---

    const totalActiveContracts = contracts.filter(c => c.status === 'Active').length
    const onProgressContracts = contracts.filter(c => c.status === 'On Progress').length

    // Status Breakdown (Keep for chart)
    const statusCounts: Record<string, number> = {}
    contracts.forEach(c => {
        const s = c.status || 'Unknown'
        statusCounts[s] = (statusCounts[s] || 0) + 1
    })

    // Division Breakdown (Keep for chart)
    const divisionCounts: Record<string, number> = {}
    contracts.forEach(c => {
        const d = c.division || 'Unassigned'
        divisionCounts[d] = (divisionCounts[d] || 0) + 1
    })

    // PIC Performance
    const picStats: Record<string, PicPerformance> = {}

    // Lead Time & Stacked Chart Prep
    let overallLeadTimeSum = 0
    let overallLeadTimeCount = 0

    // Structure for Stacked Chart: { name: "PIC Name", Drafting: 5, Review: 2, ... }
    const picStepData: Record<string, Record<string, { totalDays: number; count: number }>> = {}
    const allStepNames = new Set<string>()

    contracts.forEach(c => {
        // Safe access to profile name
        let name = 'Unknown User'
        if (c.profiles) {
            if (Array.isArray(c.profiles)) {
                if (c.profiles.length > 0 && c.profiles[0]?.full_name) {
                    name = c.profiles[0].full_name
                }
            } else if ((c.profiles as any).full_name) {
                name = (c.profiles as any).full_name
            }
        }

        if (!picStats[name]) {
            picStats[name] = {
                name,
                total: 0,
                active: 0,
                onProgress: 0,
                completed: 0,
                divisions: new Set(),
                leadTimeSum: 0,
                leadTimeCount: 0
            }
        }

        // Basic Counts
        picStats[name].total++
        if (c.division) picStats[name].divisions.add(c.division)
        if (c.status === 'Active') picStats[name].active++
        if (c.status === 'On Progress') picStats[name].onProgress++
        if (c.status === 'Completed') picStats[name].completed++

        // 1. Calculate Contract Lead Time (Earliest Start -> Latest End)
        // Only for Completed or Active contracts per requirements
        if (c.status === 'Completed' || c.status === 'Active') {
            if (c.contract_bid_agenda && c.contract_bid_agenda.length > 0) {
                const startDates = c.contract_bid_agenda.map(a => a.start_date).filter(Boolean) as string[]
                const endDates = c.contract_bid_agenda.map(a => a.end_date).filter(Boolean) as string[]

                if (startDates.length > 0 && endDates.length > 0) {
                    const minStart = startDates.sort()[0]
                    const maxEnd = endDates.sort().reverse()[0]
                    const days = differenceInDays(parseISO(maxEnd), parseISO(minStart))
                    if (days >= 0) {
                        // Global Avg
                        overallLeadTimeSum += days
                        overallLeadTimeCount++

                        // PIC Avg
                        picStats[name].leadTimeSum += days
                        picStats[name].leadTimeCount++
                    }
                }
            }
        }

        // 2. Aggregate Step Durations per PIC (All contracts to show performance)
        if (c.contract_bid_agenda && c.contract_bid_agenda.length > 0) {
            // Re-resolve name (already done above, reusing 'name')
            if (!picStepData[name]) picStepData[name] = {}

            c.contract_bid_agenda.forEach(step => {
                if (step.start_date && step.end_date && step.step_name) {
                    const stepDays = differenceInDays(parseISO(step.end_date), parseISO(step.start_date))
                    if (stepDays >= 0) {
                        if (!picStepData[name][step.step_name]) {
                            picStepData[name][step.step_name] = { totalDays: 0, count: 0 }
                        }
                        picStepData[name][step.step_name].totalDays += stepDays
                        picStepData[name][step.step_name].count++
                        allStepNames.add(step.step_name)
                    }
                }
            })
        }
    })

    const picList = Object.values(picStats).sort((a, b) => b.total - a.total)
    const avgLeadTime = overallLeadTimeCount > 0 ? Math.round(overallLeadTimeSum / overallLeadTimeCount) : 0

    // Calculate max values for bar charts scaling
    const maxStatus = Math.max(...Object.values(statusCounts), 1)
    const maxDivision = Math.max(...Object.values(divisionCounts), 1)

    // Format data for Recharts
    const stackedChartData = Object.entries(picStepData).map(([name, steps]) => {
        const row: any = { name, total: 0 }
        Object.entries(steps).forEach(([stepName, stats]) => {
            const avg = Math.round(stats.totalDays / stats.count)
            row[stepName] = avg
            row.total += avg
        })
        return row
    })

    // Colors for steps (using a palette)
    const stepColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"]
    const sortedStepNames = Array.from(allStepNames).sort()

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Performance Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of contract management performance, workload, and status.
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Active Contracts</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalActiveContracts}</div>
                        <p className="text-xs text-muted-foreground">Active Contract</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">On Progress</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{onProgressContracts}</div>
                        <p className="text-xs text-muted-foreground">On Progress Contract</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgLeadTime} days</div>
                        <p className="text-xs text-muted-foreground">End to End Average Lead Time</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Status Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Contracts by Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(statusCounts).map(([status, count]) => (
                                <div key={status} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{status}</span>
                                        <span className="text-muted-foreground">{count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${(count / maxStatus) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Division Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Contracts by Division
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(divisionCounts)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 8) // Top 8 only
                                .map(([division, count]) => (
                                    <div key={division} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate  max-w-[200px]" title={division}>{division}</span>
                                            <span className="text-muted-foreground">{count}</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${(count / maxDivision) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stacked Chart for Bid Process */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Average Bid Process Duration by PIC (Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full" style={{ height: 400, minHeight: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stackedChartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                barSize={60}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                {/* Render Bars for each step */}
                                {sortedStepNames.map((step, index) => (
                                    <Bar
                                        key={step}
                                        dataKey={step}
                                        stackId="a"
                                        fill={stepColors[index % stepColors.length]}
                                        radius={index === sortedStepNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    >
                                        {/* Add LabelList to the LAST bar to act as the Total label */}
                                        {index === sortedStepNames.length - 1 && (
                                            <LabelList
                                                dataKey="total"
                                                position="top"
                                                style={{ fontWeight: 'bold', fill: '#666' }}
                                            />
                                        )}
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* PIC Performance Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Workload & Performance (PIC)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ExpandablePICTable picList={picList} contracts={contracts} />
                </CardContent>
            </Card>
        </div>
    )
}

// Separate component for the table to keep main component cleaner
function ExpandablePICTable({ picList, contracts }: { picList: PicPerformance[], contracts: ContractData[] }) {
    // augment picList with contracts
    const data = useMemo(() => picList.map(pic => ({
        ...pic,
        contracts: contracts.filter(c => {
            let name = 'Unknown User'
            if (c.profiles) {
                if (Array.isArray(c.profiles)) {
                    if (c.profiles.length > 0 && c.profiles[0]?.full_name) name = c.profiles[0].full_name
                } else if ((c.profiles as any).full_name) {
                    name = (c.profiles as any).full_name
                }
            }
            return name === pic.name
        })
    })), [picList, contracts])

    const columns = useMemo<ColumnDef<typeof data[0]>[]>(() => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => {
                return row.getCanExpand() ? (
                    <Button
                        className="h-8 w-8 text-muted-foreground"
                        onClick={row.getToggleExpandedHandler()}
                        size="icon"
                        variant="ghost"
                        aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
                    >
                        {row.getIsExpanded() ? (
                            <ChevronUpIcon className="h-4 w-4 opacity-60" aria-hidden="true" />
                        ) : (
                            <ChevronDownIcon className="h-4 w-4 opacity-60" aria-hidden="true" />
                        )}
                    </Button>
                ) : undefined
            }
        },
        {
            header: 'PIC Name',
            accessorKey: 'name',
            cell: ({ row }) => <div className="font-medium px-4">{row.getValue('name')}</div>
        },
        {
            header: 'Divisions',
            accessorKey: 'divisions',
            cell: ({ row }) => {
                const divisions = row.original.divisions
                return (
                    <div className="flex flex-wrap gap-1 px-4">
                        {Array.from(divisions).map(div => (
                            <Badge key={div} variant="outline" className={`text-[10px] px-1 py-0 h-5 border ${getDivisionColor(div)}`}>
                                {div}
                            </Badge>
                        ))}
                        {divisions.size === 0 && <span className="text-muted-foreground text-xs">-</span>}
                    </div>
                )
            }
        },
        {
            header: 'Total Created',
            accessorKey: 'total',
            cell: ({ row }) => <div className="text-center px-4">{row.getValue('total')}</div>
        },
        {
            header: 'Active',
            accessorKey: 'active',
            cell: ({ row }) => <div className="text-center px-4 text-blue-600 font-bold">{row.getValue('active')}</div>
        },
        {
            header: 'On Progress',
            accessorKey: 'onProgress',
            cell: ({ row }) => <div className="text-center px-4 text-orange-600 font-bold">{row.getValue('onProgress')}</div>
        },
        {
            header: 'Avg Lead Time',
            accessorFn: (row) => row.leadTimeCount > 0 ? Math.round(row.leadTimeSum / row.leadTimeCount) : 0,
            cell: ({ row }) => {
                const val = row.original.leadTimeCount > 0
                    ? Math.round(row.original.leadTimeSum / row.original.leadTimeCount) + ' days'
                    : '-'
                return <div className="text-right px-4">{val}</div>
            }
        }
    ], [])

    const table = useReactTable({
        data,
        columns,
        getRowCanExpand: () => true,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel()
    })

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id} className="hover:bg-transparent">
                            {headerGroup.headers.map(header => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map(row => (
                            <Fragment key={row.id}>
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="[&:has([aria-expanded])]:w-px [&:has([aria-expanded])]:py-0">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {row.getIsExpanded() && (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={columns.length} className="p-0">
                                            <div className="p-4 bg-muted/30">
                                                <ExpandedContractList contracts={row.original.contracts} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

function ExpandedContractList({ contracts }: { contracts: ContractData[] }) {
    // Helper to find root contract
    const contractMap = new Map(contracts.map(c => [c.id, c]))

    const getRootContract = (c: ContractData): ContractData => {
        if (!c.parent_contract_id) return c
        const parent = contractMap.get(c.parent_contract_id)
        return parent ? getRootContract(parent) : c
    }

    // Grouping Logic by Root Contract Number
    const grouped: Record<string, ContractData[]> = {}
    contracts.forEach(c => {
        const root = getRootContract(c)
        const key = root.contract_number || 'Unknown' // Group by Root's number
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(c)
    })

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([contractNumber, groupContracts]) => {
                const sortedGroup = groupContracts.sort((a, b) => a.version - b.version)
                // Use the root contract's title for the header if possible, or the first one
                const rootContract = sortedGroup.find(c => !c.parent_contract_id) || sortedGroup[0]

                return (
                    <div key={contractNumber} className="border rounded-md bg-background overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 border-b font-medium text-sm flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="font-bold">Contract #{contractNumber}</span>
                                <span className="text-xs text-muted-foreground font-normal">{rootContract.title}</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-background">
                                {sortedGroup.length} Version{sortedGroup.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[25%]">Contract Name</TableHead>
                                    <TableHead>Division</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Ver.</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Cost Saving</TableHead>
                                    <TableHead className="text-right">Avg Lead Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedGroup.map(c => {
                                    // Calculate Lead Time
                                    let leadTime = '-'
                                    if (c.contract_bid_agenda && c.contract_bid_agenda.length > 0) {
                                        const startDates = c.contract_bid_agenda.map(a => a.start_date).filter(Boolean) as string[]
                                        const endDates = c.contract_bid_agenda.map(a => a.end_date).filter(Boolean) as string[]
                                        if (startDates.length > 0 && endDates.length > 0) {
                                            const minStart = startDates.sort()[0]
                                            const maxEnd = endDates.sort().reverse()[0]
                                            const days = differenceInDays(parseISO(maxEnd), parseISO(minStart))
                                            if (days >= 0) leadTime = `${days} days`
                                        }
                                    }

                                    // Calculate Value and Saving
                                    let displayValue = '-'
                                    let displaySaving = '-'
                                    let vendorName = '-'

                                    const appointed = c.contract_vendors?.find(v => v.is_appointed)
                                    if (appointed) {
                                        vendorName = appointed.vendor_name
                                        const finalPrice = appointed.revised_price_note || appointed.price_note
                                        if (finalPrice) {
                                            // Clean string first then format
                                            const clean = finalPrice.replace(/[^0-9.-]+/g, "")
                                            displayValue = formatCurrency(parseFloat(clean))
                                        }

                                        if (appointed.price_note && appointed.revised_price_note) {
                                            const { difference, isSaving } = calculatePriceDifference(appointed.price_note, appointed.revised_price_note)
                                            if (isSaving && difference > 0) displaySaving = formatCurrency(difference)
                                        }
                                    } else if (c.final_contract_amount) {
                                        displayValue = formatCurrency(c.final_contract_amount)
                                    }

                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {c.title}
                                                    {c.version > 1 && (
                                                        <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200 text-[10px] px-1 py-0 h-5">
                                                            Amendment
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {c.division && (
                                                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-5 border ${getDivisionColor(c.division)}`}>
                                                        {c.division}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{vendorName}</TableCell>
                                            <TableCell><Badge variant="outline">v{c.version}</Badge></TableCell>
                                            <TableCell>
                                                <ContractStatusBadge status={c.status} className="text-[10px]" />
                                            </TableCell>
                                            <TableCell>{c.expiry_date ? format(new Date(c.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                                            <TableCell>{displayValue}</TableCell>
                                            <TableCell className="text-green-600 font-medium">{displaySaving}</TableCell>
                                            <TableCell className="text-right">{leadTime}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )
            })}
        </div>
    )
}
