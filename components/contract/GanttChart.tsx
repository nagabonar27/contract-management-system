"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"
import { format, differenceInDays, parseISO, min, max } from "date-fns"

interface AgendaItem {
    id: string
    step_name: string
    start_date: string | null
    end_date: string | null
    status?: string
}

interface VendorItem {
    id: string
    vendor_name: string
    step_dates?: Array<{
        agenda_step_id: string
        start_date: string | null
        end_date: string | null
    }>
}

interface GanttChartProps {
    agendaItems: AgendaItem[]
    vendorItems?: VendorItem[]
}

export function GanttChart({ agendaItems, vendorItems = [] }: GanttChartProps) {
    const [zoom, setZoom] = React.useState(100)

    // Create timeline items: steps with vendor dates
    const timelineItems: Array<{
        id: string
        name: string
        start_date: string
        end_date: string
        type: 'step_header' | 'vendor'
        agendaStepId?: string
    }> = []

    // Group vendors by agenda step
    const stepVendorMap = new Map<string, Array<{
        vendor: VendorItem
        stepDate: { start_date: string; end_date: string }
    }>>()

    // Collect all vendor dates grouped by step
    vendorItems.forEach(vendor => {
        vendor.step_dates?.forEach(sd => {
            if (sd.start_date && sd.end_date) {
                if (!stepVendorMap.has(sd.agenda_step_id)) {
                    stepVendorMap.set(sd.agenda_step_id, [])
                }
                stepVendorMap.get(sd.agenda_step_id)!.push({
                    vendor,
                    stepDate: { start_date: sd.start_date, end_date: sd.end_date }
                })
            }
        })
    })

    // Build timeline: show each vendor as "Step Name: Vendor Name"
    agendaItems.forEach(step => {
        const vendorsForStep = stepVendorMap.get(step.id)

        if (vendorsForStep && vendorsForStep.length > 0) {
            // Add each vendor as separate row with "Step: Vendor" format
            vendorsForStep.forEach(({ vendor, stepDate }) => {
                timelineItems.push({
                    id: `${vendor.id}-${step.id}`,
                    name: `${step.step_name}: ${vendor.vendor_name}`,
                    start_date: stepDate.start_date,
                    end_date: stepDate.end_date,
                    type: 'vendor',
                    agendaStepId: step.id
                })
            })
        } else if (step.start_date && step.end_date) {
            // Show step without vendors if it has its own dates
            timelineItems.push({
                id: `step-${step.id}`,
                name: step.step_name,
                start_date: step.start_date,
                end_date: step.end_date,
                type: 'step_header',
                agendaStepId: step.id
            })
        }
    })

    if (timelineItems.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Bid Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No timeline data available. Add vendor dates to see the timeline.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Calculate date range from all timeline items
    const allDates = timelineItems.flatMap(item => [
        parseISO(item.start_date),
        parseISO(item.end_date)
    ])
    const minDate = min(allDates)
    const maxDate = max(allDates)
    // Add 1 day to include the last day in the range
    const totalDays = differenceInDays(maxDate, minDate) + 1

    // Get status color
    const getStatusColor = (item: typeof timelineItems[0]) => {
        const endDate = new Date(item.end_date)
        const startDate = new Date(item.start_date)
        const today = new Date()

        if (endDate < today) {
            return item.type === 'vendor' ? "bg-green-400" : "bg-green-500" // Completed
        }
        if (startDate <= today && endDate >= today) {
            return item.type === 'vendor' ? "bg-blue-400" : "bg-blue-500" // In Progress
        }
        return item.type === 'vendor' ? "bg-gray-300" : "bg-gray-400" // Not Started
    }

    const getStatusBadge = (item: typeof timelineItems[0]) => {
        const endDate = new Date(item.end_date)
        const startDate = new Date(item.start_date)
        const today = new Date()

        if (endDate < today) {
            return <Badge variant="default" className="bg-green-600 text-xs">Completed</Badge>
        }
        if (startDate <= today && endDate >= today) {
            return <Badge variant="default" className="bg-blue-600 text-xs">In Progress</Badge>
        }
        return <Badge variant="secondary" className="text-xs">Not Started</Badge>
    }

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))

    return (
        <Card className="shadow-lg border-0 animate-fade-in">
            <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ZoomIn className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-xl font-bold">Project Timeline</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground ml-12">
                            {format(minDate, 'MMM dd, yyyy')} - {format(maxDate, 'MMM dd, yyyy')} • {totalDays} days duration
                        </p>
                    </div>
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-secondary">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 hover:bg-white/50"
                            onClick={handleZoomOut}
                            disabled={zoom <= 50}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground min-w-[40px] text-center">
                            {zoom}%
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 hover:bg-white/50"
                            onClick={handleZoomIn}
                            disabled={zoom >= 200}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Scrollable Timeline Container */}
                <div className="overflow-x-auto pb-4">
                    <div className="space-y-4 min-w-[800px]">
                        {/* Header Row */}
                        <div className="flex items-center gap-6 pb-2 border-b">
                            <div className="w-56 text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">Step / Vendor</div>
                            <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</div>
                            <div className="w-32 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</div>
                            <div className="w-24 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</div>
                        </div>

                        {/* Month/Date Header Row */}
                        <div className="flex items-center gap-6 relative">
                            <div className="w-56 shrink-0"></div>
                            <div className="flex-1 h-8 relative border-b border-dashed border-gray-200">
                                {/* Generate month markers */}
                                {(() => {
                                    const months: { label: string; leftPercent: number }[] = []
                                    let currentDate = new Date(minDate)
                                    // Make sure we stop before maxDate
                                    while (currentDate <= maxDate) {
                                        const daysFromStart = differenceInDays(currentDate, minDate)
                                        const leftPercent = (daysFromStart / totalDays) * 100

                                        // Only add if it fits
                                        if (leftPercent <= 100) {
                                            months.push({
                                                label: format(currentDate, 'MMM yyyy'),
                                                leftPercent
                                            })
                                        }

                                        // Move to next month
                                        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                                    }

                                    return months.map((month, idx) => (
                                        <div
                                            key={idx}
                                            className="absolute text-xs font-medium text-gray-500 transform -translate-x-1/2 flex flex-col items-center"
                                            style={{ left: `${month.leftPercent}%` }}
                                        >
                                            <span className="mb-1">{month.label}</span>
                                            <div className="h-2 w-px bg-gray-300"></div>
                                        </div>
                                    ))
                                })()}
                            </div>
                            <div className="w-32 shrink-0"></div>
                            <div className="w-24 shrink-0"></div>
                        </div>

                        {/* Timeline Rows */}
                        <div className="space-y-3">
                            {timelineItems.map((item, idx) => {
                                const start = parseISO(item.start_date)
                                const end = parseISO(item.end_date)
                                const daysFromStart = differenceInDays(start, minDate)
                                const duration = differenceInDays(end, start) + 1

                                const leftPercent = (daysFromStart / totalDays) * 100
                                const widthPercent = (duration / totalDays) * 100

                                const isVendor = item.type === 'vendor'

                                return (
                                    <div
                                        key={item.id}
                                        className={`group flex items-center gap-6 hover:bg-muted/30 p-2 rounded-lg transition-colors duration-200 animate-slide-in-right`}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Step/Vendor Name */}
                                        <div className="w-56 shrink-0 flex items-center gap-2">
                                            {isVendor ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-2"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-primary/70"></div>
                                            )}
                                            <div className={`text-sm truncate ${isVendor ? 'text-muted-foreground pl-1 font-normal' : 'font-medium text-foreground'
                                                }`} title={item.name}>
                                                {isVendor ? item.name.split(':')[1]?.trim() || item.name : item.name}
                                            </div>
                                        </div>

                                        {/* Timeline Bar Container */}
                                        <div className="flex-1 h-6 relative bg-secondary/20 rounded-full">
                                            {/* Bar */}
                                            <div
                                                className={`absolute top-1 bottom-1 rounded-full ${getStatusColor(item)} shadow-sm transition-all duration-300 group-hover:brightness-95 group-hover:scale-y-110`}
                                                style={{
                                                    left: `${Math.max(0, leftPercent)}%`,
                                                    width: `${Math.min(100, widthPercent)}%`,
                                                    minWidth: '4px'
                                                }}
                                            >
                                                {/* Tooltip on hover */}
                                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap z-10 pointer-events-none transition-opacity">
                                                    {format(start, 'MMM dd')} - {format(end, 'MMM dd')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="w-32 text-xs shrink-0 flex flex-col justify-center">
                                            <span className="font-medium text-gray-700">{duration} days</span>
                                            <span className="text-[10px] text-muted-foreground">{format(start, 'MMM dd')} - {format(end, 'MMM dd')}</span>
                                        </div>

                                        {/* Status */}
                                        <div className="w-24 shrink-0">
                                            {getStatusBadge(item)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-8 flex justify-center">
                    <div className="bg-secondary/20 px-4 py-2 rounded-full flex items-center gap-6 text-xs font-medium border border-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                            <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                            <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-400 rounded-full shadow-sm"></div>
                            <span>Pending</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
