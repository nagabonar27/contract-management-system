import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateRangePicker, DateRange } from "@/components/DatePicker"
import { Trash2 } from "lucide-react"
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
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 border-b">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                        const section = document.getElementById(`vendor-section-${item.id}`)
                        if (section) {
                            section.style.display = section.style.display === 'none' ? 'block' : 'block' // Always keep block for now or toggle
                            section.classList.toggle('hidden')
                        }
                    }}
                >
                    <span className="text-xs">▼</span>
                </Button>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Candidates</h4>
            </div>
            <div id={`vendor-section-${item.id}`} className="">
                {stepVendors.length === 0 && (
                    <div className="px-10 py-2 text-xs text-muted-foreground italic">No candidates added.</div>
                )}
                {stepVendors.map(v => (
                    <div key={v.id} className="flex items-start text-sm hover:bg-muted/50 transition-colors border-b last:border-0 py-2">
                        {/* Column 1: Vendor Name - matches w-1/3 roughly or padding */}
                        <div className="w-1/3 px-4 pl-10 flex items-center h-9">
                            {isEditingAgenda ? (
                                <Input
                                    value={v.vendor_name}
                                    onChange={(e) => onUpdateVendorData(v.id, "vendor_name", e.target.value)}
                                    className="w-full h-8 text-xs font-medium bg-white"
                                    placeholder="Vendor Name"
                                />
                            ) : (
                                <span className="font-medium truncate" title={v.vendor_name}>{v.vendor_name}</span>
                            )}
                        </div>

                        {/* Column 2: Timeline - matches w-[300px] */}
                        <div className="w-[300px] px-4 flex flex-col justify-start">
                            {isEditingAgenda ? (
                                <DateRangePicker
                                    className="w-full"
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
                                    const startDate = stepDate?.start_date
                                    const endDate = stepDate?.end_date

                                    return (startDate || endDate) ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Start: {startDate || "-"}</span>
                                            <span className="text-xs text-muted-foreground">End: {endDate || "-"}</span>
                                        </div>
                                    ) : <span className="text-xs text-muted-foreground">-</span>
                                })()
                            )}
                        </div>

                        {/* Column 3: Remarks - matches flex-1 */}
                        <div className="flex-1 px-4 h-9 flex items-center">
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
                                    className="w-full h-8 text-xs bg-white"
                                    placeholder="Remarks..."
                                />
                            ) : (
                                (() => {
                                    const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                    return <span className="text-xs">{stepDate?.remarks || "-"}</span>
                                })()
                            )}
                        </div>

                        {/* Column 4: Action (Delete) */}
                        {isEditingAgenda && (
                            <div className="px-4 h-9 flex items-center justify-end w-[80px]">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-700"
                                    onClick={() => onDeleteVendor(v.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                ))}

                {isEditingAgenda && (
                    <div className="flex items-center gap-2 mt-2 px-10">
                        <Input
                            placeholder="Add New Vendor Candidate..."
                            className="h-8 w-[250px] text-xs bg-white"
                            value={newVendorName}
                            onChange={e => onNewVendorNameChange(e.target.value)}
                        />
                        <Button size="sm" className="h-8" onClick={() => onAddVendor(item.id)}>
                            Add Candidate
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
