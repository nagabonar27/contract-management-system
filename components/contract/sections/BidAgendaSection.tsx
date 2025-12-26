import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddStepModal } from "@/components/ui/shared/add-step-modal"
import { Trash2, Calendar, ChevronRight, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { VendorEvaluationRows } from "./VendorEvaluationRows"
import { VendorFindingsSubSection } from "./VendorFindingsSubSection"
import { DateRangePicker, DateRange } from "@/components/DatePicker"
import { format, parseISO } from "date-fns"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

// Export types for use in other components
export interface AgendaItem {
    id: string
    contract_id: string
    step_name: string
    start_date: string | null
    end_date: string | null
    actual_start_date?: string | null
    actual_end_date?: string | null
    remarks: string | null
    status: string
    created_at: string
}

export interface VendorStepDate {
    id: string
    vendor_id: string
    agenda_step_id: string
    start_date: string | null
    end_date: string | null
    remarks?: string | null
}

export interface ContractVendor {
    id: string
    contract_id: string
    vendor_name: string
    start_date: string | null
    end_date: string | null
    kyc_result: string | null
    kyc_note: string | null
    tech_eval_note: string | null
    tech_eval_score?: number | null
    tech_eval_remarks?: string | null
    price_note: string | null
    revised_price_note: string | null
    agenda_step_id: string | null
    created_at: string
    step_dates?: VendorStepDate[]
    is_appointed?: boolean
}

interface BidAgendaSectionProps {
    agendaList: AgendaItem[]
    vendorList: ContractVendor[]
    isEditingAgenda: boolean
    isSavingAgenda: boolean
    newVendorName: string
    onEditToggle: () => void
    onSaveAll: () => void
    onAddStep: (stepName: string) => void
    onDeleteStep: (stepId: string) => void
    onUpdateAgendaItem: (itemId: string, field: keyof AgendaItem, value: string) => void
    onUpdateVendorData: (vendorId: string, field: keyof ContractVendor, value: any) => void
    onAddVendor: (stepId: string) => void
    onDeleteVendor: (vendorId: string) => void
    onNewVendorNameChange: (value: string) => void
    appointedVendorName?: string | null
    onAppointedVendorChange?: (name: string) => void
    // Sync Props
    expandedSteps?: Set<string>
    onToggleStep?: (stepId: string) => void
    onExpandAll?: () => void
    onCollapseAll?: () => void
}

export function BidAgendaSection({
    agendaList,
    vendorList,
    isEditingAgenda,
    isSavingAgenda,
    newVendorName,
    onEditToggle,
    onSaveAll,
    onAddStep,
    onDeleteStep,
    onUpdateAgendaItem,
    onUpdateVendorData,
    onAddVendor,
    onDeleteVendor,
    onNewVendorNameChange,
    appointedVendorName,
    onAppointedVendorChange,
    expandedSteps,
    onToggleStep,
    onExpandAll,
    onCollapseAll,
}: BidAgendaSectionProps) {

    // Helper to calculate sub-duration
    const getSubDuration = (item: AgendaItem) => {
        if (!item.actual_start_date || !item.actual_end_date) return 0
        const start = parseISO(item.actual_start_date)
        const end = parseISO(item.actual_end_date)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays + 1 // Inclusive
    }


    // Helper: Determine if step is vendor dependent
    const isVendorDependentStep = (stepName: string) => {
        const s = stepName.toLowerCase().trim()
        return s.includes("kyc") ||
            s.includes("tech") ||
            s.includes("price") ||
            s.includes("clarification") ||
            s.includes("administratif") ||
            s.includes("document") ||
            s.includes("review") ||
            s.includes("negotiation") ||
            (s.includes("vendor") && !s.includes("findings") && !s.includes("contract") && !s.includes("appointed"))
    }

    const isAppointedVendorStep = (stepName: string) => stepName.toLowerCase().trim() === "appointed vendor"

    return (
        <div className="space-y-4 p-6 pb-20">
            {/* Header Tools */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    {expandedSteps && expandedSteps.size === agendaList.length ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCollapseAll}
                            className="text-xs text-muted-foreground"
                        >
                            <ChevronRight className="h-3.5 w-3.5 mr-1" /> Collapse All
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onExpandAll}
                            className="text-xs text-muted-foreground"
                        >
                            <ChevronDown className="h-3.5 w-3.5 mr-1" /> Expand All
                        </Button>
                    )}
                </div>
            </div>

            {agendaList.map((item, index) => {
                const subDuration = getSubDuration(item)
                const isExpanded = expandedSteps?.has(item.id)
                const isVendorItem = item.step_name === "Vendor Findings"
                const isDependent = isVendorDependentStep(item.step_name)
                const isAppointed = isAppointedVendorStep(item.step_name)

                // Calculate Display Dates (Aggregation for Dependent Steps)
                let displayStart = item.start_date
                let displayEnd = item.end_date

                // For dependent steps, ALWAYS prefer the aggregated vendor dates
                // This ensures that if we update a vendor, the header updates immediately
                if (isDependent) {
                    const relatedDates = vendorList
                        .flatMap(v => v.step_dates || [])
                        .filter(sd => sd.agenda_step_id === item.id)

                    if (relatedDates.length > 0) {
                        const startTimes = relatedDates.map(d => d.start_date ? new Date(d.start_date).getTime() : Infinity).filter(t => t !== Infinity)
                        const endTimes = relatedDates.map(d => d.end_date ? new Date(d.end_date).getTime() : -Infinity).filter(t => t !== -Infinity)

                        if (startTimes.length > 0) {
                            const minStart = new Date(Math.min(...startTimes))
                            displayStart = format(minStart, "yyyy-MM-dd")
                        }
                        if (endTimes.length > 0) {
                            const maxEnd = new Date(Math.max(...endTimes))
                            displayEnd = format(maxEnd, "yyyy-MM-dd")
                        }
                    }
                }

                // Recalculate duration based on display dates
                let displayDuration = 0
                if (displayStart && displayEnd) {
                    const start = parseISO(displayStart)
                    const end = parseISO(displayEnd)
                    const diffTime = Math.abs(end.getTime() - start.getTime())
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    displayDuration = diffDays + 1
                }

                return (
                    <Card key={item.id} className={cn("border-l-4 shadow-sm transition-all overflow-visible",
                        item.status === 'Completed' ? "border-l-green-500" :
                            item.status === 'In Progress' ? "border-l-blue-500" : "border-l-slate-200"
                    )}>
                        <CardHeader className="py-3 px-4 bg-muted/5 border-b flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full hover:bg-slate-200"
                                    onClick={() => onToggleStep?.(item.id)}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-500" />
                                    )}
                                </Button>
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                    item.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                )}>
                                    {index + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        {/* READ ONLY STEP NAME */}
                                        <span className="text-sm font-semibold truncate" title={item.step_name}>
                                            {item.step_name}
                                        </span>
                                        <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal",
                                            item.status === 'Completed' ? "bg-green-50 text-green-700" :
                                                item.status === 'In Progress' ? "bg-blue-50 text-blue-700" : ""
                                        )}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
                                        <span>{displayDuration} Days</span>
                                        {displayStart && (
                                            <span className="hidden sm:inline">| {displayStart} - {displayEnd}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Date & Actions */}

                        </CardHeader>

                        {/* Expandable Content */}
                        {isExpanded && (
                            <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                                {isEditingAgenda && (
                                    <div className="p-3 border-b bg-gray-50 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            {(!isVendorItem && !isDependent) && <span className="text-xs font-semibold text-muted-foreground mr-2">Dates:</span>}
                                            {!isDependent && !isVendorItem && (
                                                <DateRangePicker
                                                    className="w-[240px] bg-white border shadow-sm"
                                                    value={{
                                                        from: item.start_date ? parseISO(item.start_date) : undefined,
                                                        to: item.end_date ? parseISO(item.end_date) : undefined,
                                                    }}
                                                    onChange={(val) => {
                                                        const s = val?.from ? format(val.from, 'yyyy-MM-dd') : ""
                                                        const e = val?.to ? format(val.to, 'yyyy-MM-dd') : ""
                                                        if (s) onUpdateAgendaItem(item.id, "start_date", s)
                                                        if (e) onUpdateAgendaItem(item.id, "end_date", e)
                                                    }}
                                                />
                                            )}

                                            {(isVendorItem || isDependent) && <span className="text-xs text-muted-foreground italic">Configuration available below.</span>}

                                        </div>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-8 px-3 text-xs shadow-sm"
                                            onClick={(e) => { e.stopPropagation(); onDeleteStep(item.id); }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Step
                                        </Button>
                                    </div>
                                )}
                                {/* Vendor Finding Special Section */}
                                {isVendorItem && (
                                    <div className="border-t border-l-[3px] border-l-purple-500 bg-purple-50/10 p-4">
                                        <VendorFindingsSubSection
                                            item={item}
                                            stepVendors={vendorList}
                                            isEditingAgenda={isEditingAgenda}
                                            newVendorName={newVendorName}
                                            onNewVendorNameChange={onNewVendorNameChange}
                                            onAddVendor={onAddVendor}
                                            onDeleteVendor={onDeleteVendor}
                                            onUpdateVendorData={onUpdateVendorData}
                                        />
                                    </div>
                                )}

                                {/* Dependent Steps (KYC, Tech, Price) */}
                                {isDependent && (
                                    <div className="border-t border-l-[3px] border-l-purple-500 bg-purple-50/10 p-4">
                                        <div className="space-y-4 pt-2">
                                            <VendorEvaluationRows
                                                agendaItem={item}
                                                vendorList={vendorList}
                                                isEditingAgenda={isEditingAgenda}
                                                onUpdateVendorData={onUpdateVendorData}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Appointed Vendor */}



                                {isAppointed && (
                                    <div className="px-4 py-3 border-t bg-slate-50/30 flex flex-col gap-2">
                                        <Label className="text-xs text-muted-foreground  font-semibold">Appointed Vendor</Label>
                                        <div className="flex items-center gap-4">
                                            {isEditingAgenda ? (
                                                <Select
                                                    value={appointedVendorName || ""}
                                                    onValueChange={onAppointedVendorChange}
                                                >
                                                    <SelectTrigger className="w-[300px] h-8 text-sm bg-white">
                                                        <SelectValue placeholder="Select Winner..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {vendorList.filter(v => v.kyc_result !== 'Fail').map(v => (
                                                            <SelectItem key={v.id} value={v.vendor_name}>
                                                                {v.vendor_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className="bg-green-600 text-white hover:bg-green-700 text-sm py-1 px-3">
                                                    {appointedVendorName || "No Vendor Appointed"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Default Remarks (if not any of the above special cases) */}
                                {!isVendorItem && !isDependent && (
                                    <div className="p-4 bg-slate-50/50 border-t flex flex-col gap-2">
                                        <Label className="text-xs text-muted-foreground uppercase font-semibold">Remarks / Outcome</Label>
                                        {isEditingAgenda ? (
                                            <Textarea
                                                value={item.remarks || ""}
                                                onChange={(e) => onUpdateAgendaItem(item.id, "remarks", e.target.value)}
                                                className="min-h-[80px] bg-white text-sm"
                                                placeholder="Add details about this step..."
                                            />
                                        ) : (
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {item.remarks || "No remarks provided."}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )
            })}

            {isEditingAgenda && (
                <div className="w-full">
                    <AddStepModal onSelect={onAddStep} />
                </div>
            )}
        </div>
    )
}
