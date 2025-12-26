import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateRangePicker, DateRange } from "@/components/DatePicker"
import { Trash2, Plus } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ContractVendor, VendorStepDate } from "./BidAgendaSection"

interface VendorFindingsSubSectionProps {
    item: { id: string, step_name: string }
    stepVendors: ContractVendor[]
    isEditingAgenda: boolean
    newVendorName: string
    onNewVendorNameChange: (val: string) => void
    onAddVendor: (stepId: string) => void
    onDeleteVendor: (vendorId: string) => void
    onUpdateVendorData: (vendorId: string, field: keyof ContractVendor, value: any) => void
}

export function VendorFindingsSubSection({
    item,
    stepVendors,
    isEditingAgenda,
    newVendorName,
    onNewVendorNameChange,
    onAddVendor,
    onDeleteVendor,
    onUpdateVendorData
}: VendorFindingsSubSectionProps) {
    return (
        <div className="space-y-3">
            <div id={`vendor-section-${item.id}`} className="space-y-4 pt-2">
                {stepVendors.length === 0 && (
                    <div className="px-10 py-2 text-xs text-muted-foreground italic">No candidates added.</div>
                )}
                {stepVendors.map(v => (
                    <div key={v.id} className="bg-white border border-border-light dark:border-border-dark rounded-lg shadow-sm overflow-hidden">
                        {/* HEADER: Vendor Name + Delete */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border-light dark:border-border-dark">
                            <div className="flex-1">
                                {isEditingAgenda ? (
                                    <Input
                                        value={v.vendor_name}
                                        onChange={(e) => onUpdateVendorData(v.id, "vendor_name", e.target.value)}
                                        className="w-full max-w-[300px] h-8 text-sm font-semibold bg-white"
                                        placeholder="Vendor Name"
                                    />
                                ) : (
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{v.vendor_name}</span>
                                )}
                            </div>
                            {isEditingAgenda && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => onDeleteVendor(v.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="p-4 space-y-4">
                            {/* DATES ROW */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Timeline</Label>
                                {isEditingAgenda ? (
                                    <DateRangePicker
                                        className="w-full sm:w-[300px]"
                                        value={(() => {
                                            const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                            return {
                                                from: stepDate?.start_date ? parseISO(stepDate.start_date) : undefined,
                                                to: stepDate?.end_date ? parseISO(stepDate.end_date) : undefined
                                            }
                                        })()}
                                        onChange={(val: DateRange | undefined) => {
                                            const stepDates = v.step_dates || []
                                            const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === item.id)

                                            const startDate = val?.from ? format(val.from, 'yyyy-MM-dd') : null
                                            const endDate = val?.to ? format(val.to, 'yyyy-MM-dd') : null

                                            let updated
                                            if (existingIndex >= 0) {
                                                updated = [...stepDates]
                                                updated[existingIndex] = {
                                                    ...updated[existingIndex],
                                                    start_date: startDate,
                                                    end_date: endDate
                                                }
                                            } else {
                                                updated = [...stepDates, {
                                                    id: `temp-${Date.now()}`,
                                                    vendor_id: v.id,
                                                    agenda_step_id: item.id,
                                                    start_date: startDate,
                                                    end_date: endDate
                                                }]
                                            }
                                            onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                        }}
                                    />
                                ) : (
                                    (() => {
                                        const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                        return (stepDate?.start_date || stepDate?.end_date) ? (
                                            <div className="text-sm border rounded px-3 py-1.5 bg-slate-50 dark:bg-slate-800 inline-block">
                                                {stepDate.start_date || "?"} - {stepDate.end_date || "?"}
                                            </div>
                                        ) : <span className="text-sm text-muted-foreground">-</span>
                                    })()
                                )}
                            </div>

                            {/* REMARKS ROW */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Remarks</Label>
                                {isEditingAgenda ? (
                                    <Input
                                        value={(() => {
                                            const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                            return stepDate?.remarks || ""
                                        })()}
                                        onChange={e => {
                                            const val = e.target.value
                                            const stepDates = v.step_dates || []
                                            const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === item.id)

                                            let updated
                                            if (existingIndex >= 0) {
                                                updated = [...stepDates]
                                                updated[existingIndex] = { ...updated[existingIndex], remarks: val }
                                            } else {
                                                updated = [...stepDates, {
                                                    id: `temp-${Date.now()}`,
                                                    vendor_id: v.id,
                                                    agenda_step_id: item.id,
                                                    start_date: null,
                                                    end_date: null,
                                                    remarks: val
                                                }]
                                            }
                                            onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                        }}
                                        className="h-9 w-full text-sm bg-white"
                                        placeholder="Add remarks..."
                                    />
                                ) : (
                                    <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border">
                                        {v.step_dates?.find(sd => sd.agenda_step_id === item.id)?.remarks || "No remarks."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isEditingAgenda && (
                    <div className="flex items-center gap-2 mt-2 px-1">
                        <Input
                            placeholder="Add New Vendor Candidate..."
                            className="h-9 w-[250px] text-sm bg-white"
                            value={newVendorName}
                            onChange={e => onNewVendorNameChange(e.target.value)}
                        />
                        <Button size="sm" className="h-9" onClick={() => onAddVendor(item.id)}>
                            <Plus className="h-4 w-4 mr-1" /> Add Candidate
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
