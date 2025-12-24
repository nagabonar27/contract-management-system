"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ContractStatusChartProps {
    contracts: any[]
}

const STEP_MAPPING = [
    // PRE-AWARD (Blue)
    { label: "Drafting", key: "Contract Drafting", color: "bg-blue-500" },
    { label: "Draft Compl", key: "Draft Completed", color: "bg-blue-500" },
    { label: "Rev & Clarif", key: "Review & Clarification", color: "bg-blue-500" },
    { label: "Vend Find", key: "Vendor Findings", color: "bg-blue-500" },
    { label: "KYC", key: "KYC Review", color: "bg-blue-500" },
    { label: "Vend Docs", key: "Vendor Administratif & Bid Document", color: "bg-blue-500" },
    { label: "Price Prop", key: "Price Proposal", color: "bg-blue-500" },
    { label: "Clarif Mtg", key: "Clarification Meeting", color: "bg-blue-500" },
    { label: "Clarif Per", key: "Clarification Period & Response", color: "bg-blue-500" },
    { label: "Rev Price", key: "Revised Price Proposal", color: "bg-blue-500" },
    { label: "Tech Eval", key: "Technical Evaluation", color: "bg-blue-500" },
    { label: "Price Comp", key: "Price Comparison", color: "bg-blue-500" },
    { label: "Appointed", key: "Appointed Vendor", color: "bg-blue-500" },
    // POST-AWARD (Red) - Shifted based on user request ("Pre-award ends at Appointed")
    { label: "Negotiation", key: "Negotiation", color: "bg-red-500" },
    { label: "Summ Prep", key: "Procurement Summary Preparation", color: "bg-red-500" },
    { label: "Mgmt Appr", key: "Procurement Summary Management Approval", color: "bg-red-500" },
    { label: "Contr Final", key: "Contract Finalization", color: "bg-red-500" },
    { label: "Vend Final", key: "Vendor Contract Finalization", color: "bg-red-500" },
    { label: "Int Sign", key: "Internal Contract Signature", color: "bg-red-500" },
    { label: "Vend Sign", key: "Vendor Contract Signature", color: "bg-red-500" },
    { label: "Completed", key: "Contract Completed", color: "bg-red-500" },
]

export function ContractStatusChart({ contracts }: ContractStatusChartProps) {
    // 1. Calculate Counts & Group Contracts
    const stepData = React.useMemo(() => {
        const map: Record<string, { count: number, items: any[] }> = {}
        contracts.forEach(c => {
            const step = c.current_step || "Contract Drafting"
            if (!map[step]) {
                map[step] = { count: 0, items: [] }
            }
            map[step].count += 1
            map[step].items.push(c)
        })
        return map
    }, [contracts])

    // 2. Find Max Value for Scaling
    const maxCount = React.useMemo(() => {
        let max = 0
        STEP_MAPPING.forEach(step => {
            const val = stepData[step.key]?.count || 0
            if (val > max) max = val
        })
        return max > 0 ? max : 1
    }, [stepData])

    // Calculate flex basis for axis labels
    // Total steps = 21
    // Pre-Award = 13 steps (Indices 0-12)
    // Post-Award = 8 steps (Indices 13-20)

    return (
        <Card className="col-span-1 md:col-span-2 shadow-sm border border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>
                        Contract Status Overview
                    </CardTitle>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-sm bg-blue-500 mr-1.5" />
                        Pre-Award
                    </div>
                    <div className="flex items-center">
                        <span className="w-3 h-3 rounded-sm bg-red-500 mr-1.5" />
                        Post-Award
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full pb-2">
                    {/* Chart Container - Removed fixed width and overflow for "Longer" look without scroll */}
                    <div className="w-full h-64 flex items-end justify-between gap-1 px-2 border-b border-slate-200 dark:border-slate-700 relative pt-8 mb-8">

                        {/* Y-Axis Grid Lines & Labels (Simple implementation) */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0">
                            {[100, 80, 60, 40, 20].map((pct) => (
                                <div key={pct} className="w-full border-t border-slate-100 dark:border-slate-800 border-dashed h-0 relative">
                                </div>
                            ))}
                            <div className="w-full border-t border-slate-100 dark:border-slate-800 border-dashed h-0" />
                        </div>

                        {/* Bars */}
                        <TooltipProvider delayDuration={100}>
                            {STEP_MAPPING.map((step, index) => {
                                const data = stepData[step.key]
                                const count = data?.count || 0
                                const items = data?.items || []
                                const heightPct = (count / maxCount) * 100

                                return (
                                    <div key={step.label} className="flex-1 min-w-0 flex flex-col items-center group relative w-full h-full justify-end z-10">

                                        {/* Bar Container (Flex-1 to take available space above label) */}
                                        <div className="flex-1 w-full flex items-end justify-center relative">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`w-full max-w-[40px] ${step.color} hover:opacity-80 transition-opacity rounded-sm relative cursor-help`}
                                                        style={{ height: `${heightPct}%` }}
                                                    >
                                                        {count > 0 && (
                                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                {count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                {count > 0 && (
                                                    <TooltipContent className="max-w-[300px] p-3">
                                                        <div className="space-y-2">
                                                            <p className="font-semibold text-xs border-b pb-1 mb-1">
                                                                {step.key} ({count})
                                                            </p>
                                                            <ul className="text-xs space-y-1 max-h-[200px] overflow-y-auto">
                                                                {items.slice(0, 10).map((c: any) => (
                                                                    <li key={c.id} className="truncate">
                                                                        • {c.title}
                                                                    </li>
                                                                ))}
                                                                {items.length > 10 && (
                                                                    <li className="text-muted-foreground pt-1 italic">
                                                                        ...and {items.length - 10} more
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </div>

                                        <div className="mt-3 text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium leading-tight h-8 flex items-start justify-center overflow-hidden break-words px-0.5 w-full">
                                            {step.label}
                                        </div>
                                    </div>
                                )
                            })}
                        </TooltipProvider>

                        {/* X-Axis Grouping Labels (Overlay) */}
                        <div className="absolute bottom-[-30px] left-0 right-0 h-6 flex gap-1 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {/* Pre-Award (13 Steps) */}
                            <div className="flex-[13] flex items-center justify-center border-t-2 border-blue-200 mt-1">
                                Pre-Award
                            </div>
                            {/* Post-Award (8 Steps) */}
                            <div className="flex-[8] flex items-center justify-center border-t-2 border-red-200 mt-1">
                                Post-Award
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
