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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Project Timeline</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {format(minDate, 'MMM dd, yyyy')} - {format(maxDate, 'MMM dd, yyyy')}
                            ({totalDays} days)
                        </p>
                    </div>
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleZoomOut}
                            disabled={zoom <= 50}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                            {zoom}%
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
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
                <div className="overflow-x-auto">
                    <div className="space-y-2">
                        {/* Header Row */}
                        <div className="flex items-center gap-4 pb-2 border-b">
                            <div className="w-48 text-xs font-semibold text-muted-foreground shrink-0">Step / Vendor</div>
                            <div className="flex-1 text-xs font-semibold text-muted-foreground max-w-[600px]">Timeline</div>
                            <div className="w-32 text-xs font-semibold text-muted-foreground shrink-0">Duration</div>
                            <div className="w-24 text-xs font-semibold text-muted-foreground shrink-0">Status</div>
                        </div>

                        {/* Month/Date Header Row */}
                        <div className="flex items-center gap-4">
                            <div className="w-48 shrink-0"></div>
                            <div className="flex-1 h-6 relative border-b max-w-[600px]">
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
                                            className="absolute text-xs text-muted-foreground"
                                            style={{ left: `${month.leftPercent}%` }}
                                        >
                                            {month.label}
                                        </div>
                                    ))
                                })()}
                            </div>
                            <div className="w-32 shrink-0"></div>
                            <div className="w-24 shrink-0"></div>
                        </div>

                        {/* Timeline Rows */}
                        {timelineItems.map(item => {
                            const start = parseISO(item.start_date)
                            const end = parseISO(item.end_date)
                            const daysFromStart = differenceInDays(start, minDate)
                            const duration = differenceInDays(end, start) + 1

                            const leftPercent = (daysFromStart / totalDays) * 100
                            const widthPercent = (duration / totalDays) * 100

                            const isVendor = item.type === 'vendor'

                            return (
                                <div key={item.id} className="flex items-center gap-4">
                                    {/* Step/Vendor Name */}
                                    <div className={`w-48 text-sm shrink-0 ${isVendor ? 'font-medium' : 'font-semibold text-primary'
                                        }`} title={item.name}>
                                        {item.name}
                                    </div>

                                    {/* Timeline Bar - with max-w to prevent overflow */}
                                    <div className="flex-1 h-8 bg-gray-100 rounded relative max-w-[600px]">
                                        <div
                                            className={`absolute h-full rounded ${getStatusColor(item)} transition-all hover:opacity-80`}
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                minWidth: '2px'
                                            }}
                                            title={`${item.name}: ${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`}
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div className="w-32 text-xs text-gray-600 shrink-0">
                                        {format(start, 'MMM dd')} - {format(end, 'MMM dd')}
                                        <div className="text-xs text-muted-foreground">{duration} days</div>
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

                {/* Legend */}
                <div className="mt-6 pt-4 border-t flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                        <span>Not Started</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
