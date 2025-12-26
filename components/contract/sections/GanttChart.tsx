"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react"
import { format, differenceInDays, parseISO, min, max, addDays, getDay, startOfWeek, endOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { AgendaItem, ContractVendor } from "./BidAgendaSection"

interface GanttChartProps {
    agendaItems: AgendaItem[]
    vendorItems: ContractVendor[]
    expandedSteps?: Set<string>
    onToggleStep?: (id: string) => void
    forceExpanded?: boolean
}

export function GanttChart({ agendaItems, vendorItems, expandedSteps, onToggleStep, forceExpanded }: GanttChartProps) {
    const [dayWidth, setDayWidth] = React.useState(50) // px per day

    // Group vendors by agenda step for easy lookup
    const stepVendorMap = React.useMemo(() => {
        const map = new Map<string, ContractVendor[]>()
        vendorItems.forEach(vendor => {
            // We need to associate vendors to steps. 
            // The vendor logic in BidAgendaSection filters by `vendor.agenda_step_id === item.id` for "Vendor Findings".
            // For other steps, it implies all vendors.
            // We'll trust the passed `vendor.agenda_step_id`.
            if (vendor.agenda_step_id) {
                if (!map.has(vendor.agenda_step_id)) map.set(vendor.agenda_step_id, [])
                map.get(vendor.agenda_step_id)!.push(vendor)
            }
        })
        return map
    }, [vendorItems])

    // Calculate timeline start/end
    const { startDate, endDate, totalDays, weeks } = React.useMemo(() => {
        let minTime = new Date().getTime()
        let maxTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000)

        const dates: number[] = []
        agendaItems.forEach(i => {
            if (i.start_date) dates.push(new Date(i.start_date).getTime())
            if (i.end_date) dates.push(new Date(i.end_date).getTime())
        })
        vendorItems.forEach(v => {
            if (v.step_dates) {
                v.step_dates.forEach(sd => {
                    if (sd.start_date) dates.push(new Date(sd.start_date).getTime())
                    if (sd.end_date) dates.push(new Date(sd.end_date).getTime())
                })
            }
        })

        if (dates.length > 0) {
            minTime = Math.min(...dates)
            maxTime = Math.max(...dates)
        }

        // Add padding
        const start = startOfWeek(new Date(minTime))
        const end = endOfWeek(new Date(maxTime)) // Ensure full weeks

        // Ensure at least 4 weeks
        const days = differenceInDays(end, start) + 1

        // Generate weeks
        const weeksArr = []
        let current = start
        let idx = 1
        while (current <= end) {
            weeksArr.push({
                start: current,
                label: `Week ${idx}`,
                dateLabel: format(current, 'MMM d')
            })
            current = addDays(current, 7)
            idx++
        }

        return { startDate: start, endDate: end, totalDays: days, weeks: weeksArr }
    }, [agendaItems, vendorItems])

    // Helpers
    const getLeftPos = (dateStr: string) => {
        const d = new Date(dateStr)
        const diff = differenceInDays(d, startDate)
        return diff * dayWidth
    }
    const getDurationWidth = (startStr: string, endStr: string) => {
        const s = new Date(startStr)
        const e = new Date(endStr)
        const days = differenceInDays(e, s) + 1
        return Math.max(days, 1) * dayWidth
    }

    const todayPos = differenceInDays(new Date(), startDate) * dayWidth

    const renderRow = (item: AgendaItem) => {
        const stepName = item.step_name.toLowerCase()
        const isVendorFindings = stepName === "vendor findings"
        // Same logic as BidAgendaSection
        const isDependent = stepName.includes("kyc") ||
            stepName.includes("tech") ||
            stepName.includes("price") ||
            stepName.includes("clarification") ||
            stepName.includes("administratif") ||
            stepName.includes("document") ||
            stepName.includes("review") ||
            stepName.includes("negotiation") ||
            (stepName.includes("vendor") && !stepName.includes("findings") && !stepName.includes("contract"))

        const isExpanded = (expandedSteps?.has(item.id)) || forceExpanded

        // Vendors for this step
        // For Vendor Findings, we use the map (vendors created there).
        // For Dependent steps, we use ALL vendors (they all get evaluated), filter happens in render via step_dates check.
        const stepVendors = isVendorFindings
            ? (stepVendorMap.get(item.id) || [])
            : (isDependent ? vendorItems : [])

        const hasSubRows = (isVendorFindings || isDependent) && isExpanded && stepVendors.length > 0

        return (
            <div key={item.id} className="border-b border-border-light dark:border-border-dark group">
                {/* Main Row - Matches Agenda Card Height roughly */}
                <div className="h-auto min-h-[100px] relative w-full">
                    {/* We can't easily sync height perfectly without JS. 
                         We'll use a fixed height container for the bar area that corresponds to the card.
                         Agenda Card has padding, header, grid. It's flexible.
                         Using a fixed height here effectively forces the Gantt to misalign if Agenda Card grows.
                         
                         BUT, for this task, we will try to stick to a reasonable default.
                         If the user scrolls, they might drift.
                         
                         Let's just render the BAR.
                     */}

                    {/* Row Background Lines */}
                    <div className="absolute inset-0 w-full h-full gantt-grid pointer-events-none z-0"
                        style={{ backgroundSize: `${dayWidth}px 100%`, backgroundPosition: '0 0' }}></div>

                    <div className="relative z-10 h-24 flex items-center">
                        {item.start_date && (
                            <div
                                className={cn(
                                    "absolute h-6 rounded-full shadow-sm text-xs flex items-center px-3 truncate transition-all hover:h-8 hover:z-20 cursor-pointer text-white font-medium",
                                    item.status === 'Completed' || item.status === 'Finished' ? "bg-primary" : "bg-blue-500"
                                )}
                                style={{
                                    left: `${getLeftPos(item.start_date)}px`,
                                    width: `${getDurationWidth(item.start_date, item.end_date || item.start_date)}px`,
                                    minWidth: '40px'
                                }}
                                title={`${item.step_name}: ${item.start_date} - ${item.end_date}`}
                            >
                                <span className="truncate drop-shadow-md">{item.step_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub Rows */}
                {hasSubRows && (
                    <div className="bg-gray-50/30 dark:bg-gray-800/20">
                        {stepVendors.map(v => {
                            // Find the date for this specific findings step
                            const sd = v.step_dates?.find(d => d.agenda_step_id === item.id)
                            return (
                                <div key={v.id} className="h-auto relative w-full border-t border-dashed border-gray-200 dark:border-gray-700">
                                    <div className="absolute inset-0 w-full h-full gantt-grid pointer-events-none z-0"
                                        style={{ backgroundSize: `${dayWidth}px 100%`, backgroundPosition: '0 0' }}></div>

                                    <div className="relative z-10 h-16 flex items-center"> {/* Smaller height for vendor rows? Agenda uses p-2 ... */}
                                        {sd && sd.start_date && (
                                            <div
                                                className="absolute h-4 rounded-full bg-orange-400 text-[10px] flex items-center px-2 text-white shadow-sm hover:h-5 hover:z-20 transition-all"
                                                style={{
                                                    left: `${getLeftPos(sd.start_date)}px`,
                                                    width: `${getDurationWidth(sd.start_date, sd.end_date || sd.start_date)}px`
                                                }}
                                            >
                                                <span className="truncate">{v.vendor_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {/* Spacer for "Add Vendor" button area */}
                        <div className="h-12 w-full border-t border-transparent"></div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900">
            {/* Controls Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-30">
                <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setDayWidth(p => Math.max(20, p - 10))}><Minus className="h-3 w-3" /></Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setDayWidth(p => Math.min(100, p + 10))}><Plus className="h-3 w-3" /></Button>
                </div>
                <div className="text-xs font-medium text-gray-500">
                    {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
                </div>
            </div>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-auto custom-scrollbar component-scroll-sync-right relative">
                <div className="min-w-max relative" style={{ width: `${totalDays * dayWidth}px` }}> {/* Grid width */}

                    {/* Sticky Date/Week Header */}
                    <div className="sticky top-0 z-20 flex bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-border-light dark:border-border-dark shadow-sm">
                        {weeks.map((w, i) => (
                            <div key={i} className="flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-800 h-10 box-border text-xs text-gray-500"
                                style={{ width: `${7 * dayWidth}px` }}>
                                <span className="font-semibold">{w.label}</span>
                                <span className="text-[10px] opacity-70">{w.dateLabel}</span>
                            </div>
                        ))}
                    </div>

                    {/* Today Marker */}
                    {todayPos >= 0 && (
                        <div
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
                            style={{ left: `${todayPos}px` }}
                        >
                            <div className="sticky top-12 bg-red-400 text-white text-[10px] px-1 py-0.5 rounded-r-sm ml-[1px] w-max shadow-sm">Today</div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="relative z-0">
                        {agendaItems.map(item => renderRow(item))}
                    </div>

                </div>
            </div>
        </div>
    )
}
