"use client"

import { useRouter } from "next/navigation"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContractNav } from "@/components/contract/ContractNav"
import {
    BarChart3,
    PieChart,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    FileText,
    CalendarDays
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { differenceInDays, parseISO } from "date-fns"

type ContractData = {
    id: string
    status: string
    division: string | null
    created_at: string
    effective_date: string | null
    profiles: { full_name: string | null }[] | null
    contract_bid_agenda: { step_name: string; start_date: string | null; end_date: string | null }[]
}

type PicPerformance = {
    name: string
    total: number
    active: number
    completed: number
    department: string
}

export default function PerformancePage() {
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
                .from('contracts')
                .select(`
                    id, 
                    status, 
                    division, 
                    created_at, 
                    effective_date,
                    profiles:created_by ( full_name ),
                    contract_bid_agenda ( step_name, start_date, end_date )
                `)

            if (error) throw error
            setContracts(data || [])
        } catch (error) {
            console.error("Error fetching performance data:", error)
        } finally {
            setLoading(false)
        }
    }

    // --- Metrics Calculations ---

    const totalContracts = contracts.length
    const activeContracts = contracts.filter(c => c.status === 'Active' || c.status === 'On Progress').length
    const completedContracts = contracts.filter(c => c.status === 'Completed' || c.status === 'Active').length // Assuming Active can mean completed in some contexts, but sticking to explicit status

    // Status Breakdown
    const statusCounts: Record<string, number> = {}
    contracts.forEach(c => {
        const s = c.status || 'Unknown'
        statusCounts[s] = (statusCounts[s] || 0) + 1
    })

    // Division Breakdown
    const divisionCounts: Record<string, number> = {}
    contracts.forEach(c => {
        const d = c.division || 'Unassigned'
        divisionCounts[d] = (divisionCounts[d] || 0) + 1
    })

    // PIC Performance
    const picStats: Record<string, PicPerformance> = {}
    contracts.forEach(c => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        const name = profile?.full_name || 'Unknown User'
        if (!picStats[name]) {
            picStats[name] = { name, total: 0, active: 0, completed: 0, department: c.division || '-' }
        }
        picStats[name].total++
        if (c.status === 'Active' || c.status === 'On Progress') picStats[name].active++
        if (c.status === 'Completed') picStats[name].completed++
    })
    const picList = Object.values(picStats).sort((a, b) => b.total - a.total)

    // Calculate max values for bar charts scaling
    const maxStatus = Math.max(...Object.values(statusCounts), 1)
    const maxDivision = Math.max(...Object.values(divisionCounts), 1)

    // --- Lead Time & Stacked Chart Calculations ---

    let totalLeadTime = 0
    let leadTimeCount = 0

    // Structure for Stacked Chart: { name: "PIC Name", Drafting: 5, Review: 2, ... }
    const picStepData: Record<string, Record<string, { totalDays: number; count: number }>> = {}
    const allStepNames = new Set<string>()

    contracts.forEach(c => {
        if (c.contract_bid_agenda && c.contract_bid_agenda.length > 0) {
            // 1. Calculate Contract Lead Time (Earliest Start -> Latest End)
            const startDates = c.contract_bid_agenda.map(a => a.start_date).filter(Boolean) as string[]
            const endDates = c.contract_bid_agenda.map(a => a.end_date).filter(Boolean) as string[]

            if (startDates.length > 0 && endDates.length > 0) {
                const minStart = startDates.sort()[0]
                const maxEnd = endDates.sort().reverse()[0]
                const days = differenceInDays(parseISO(maxEnd), parseISO(minStart))
                if (days >= 0) {
                    totalLeadTime += days
                    leadTimeCount++
                }
            }

            // 2. Aggregate Step Durations per PIC
            const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
            const picName = profile?.full_name || 'Unknown User'
            if (!picStepData[picName]) picStepData[picName] = {}

            c.contract_bid_agenda.forEach(step => {
                if (step.start_date && step.end_date && step.step_name) {
                    const stepDays = differenceInDays(parseISO(step.end_date), parseISO(step.start_date))
                    if (stepDays >= 0) {
                        if (!picStepData[picName][step.step_name]) {
                            picStepData[picName][step.step_name] = { totalDays: 0, count: 0 }
                        }
                        picStepData[picName][step.step_name].totalDays += stepDays
                        picStepData[picName][step.step_name].count++
                        allStepNames.add(step.step_name)
                    }
                }
            })
        }
    })

    const avgLeadTime = leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0

    // Format data for Recharts
    const stackedChartData = Object.entries(picStepData).map(([name, steps]) => {
        const row: any = { name }
        Object.entries(steps).forEach(([stepName, stats]) => {
            row[stepName] = Math.round(stats.totalDays / stats.count)
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

            <ContractNav
                activeTab="performance"
                onTabChange={(tab) => router.push(`/contractmanagement?tab=${tab}`)}
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalContracts}</div>
                        <p className="text-xs text-muted-foreground">All time created</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active & On Progress</CardTitle>
                        <ActivityIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeContracts}</div>
                        <p className="text-xs text-muted-foreground">Currently being managed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Divisions Active</CardTitle>
                        <Users className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Object.keys(divisionCounts).length}</div>
                        <p className="text-xs text-muted-foreground">Departments involved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{picList.length}</div>
                        <p className="text-xs text-muted-foreground">Active contributors</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgLeadTime} days</div>
                        <p className="text-xs text-muted-foreground">End-to-end bid process</p>
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
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                                <RechartsTooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                {sortedStepNames.map((step, index) => (
                                    <Bar
                                        key={step}
                                        dataKey={step}
                                        stackId="a"
                                        fill={stepColors[index % stepColors.length]}
                                        radius={index === sortedStepNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
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
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PIC Name</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Division</th>
                                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Total Contracts</th>
                                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Active</th>
                                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Completed</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {picList.map((pic) => (
                                    <tr key={pic.name} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{pic.name}</td>
                                        <td className="p-4 align-middle">{pic.department}</td>
                                        <td className="p-4 align-middle text-center">{pic.total}</td>
                                        <td className="p-4 align-middle text-center text-blue-600 font-bold">{pic.active}</td>
                                        <td className="p-4 align-middle text-center text-green-600">{pic.completed}</td>
                                        <td className="p-4 align-middle text-right">
                                            {pic.total > 0
                                                ? Math.round((pic.completed / pic.total) * 100) + '%'
                                                : '0%'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function ActivityIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
