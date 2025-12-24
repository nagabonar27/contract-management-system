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
        <div className="p-4 border border-t-0 rounded-b-md space-y-3">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                        const section = document.getElementById(`vendor-section-${item.id}`)
                        if (section) {
                            section.style.display = section.style.display === 'none' ? 'block' : 'none'
                        }
                    }}
                >
                    <span className="text-lg">▼</span>
                </Button>
                <h4 className="text-sm font-semibold">Vendor Candidates</h4>
            </div>
            <div id={`vendor-section-${item.id}`}>
                {stepVendors.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No candidates added.</div>
                )}
                {stepVendors.map(v => (
                    <div key={v.id} className="flex items-center gap-3 text-sm bg-white p-3 border rounded shadow-sm mb-2">
                        <span className="w-[180px] font-medium truncate" title={v.vendor_name}>{v.vendor_name}</span>
                        {isEditingAgenda && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Timeline:</Label>
                                    <DateRangePicker
                                        className="w-[240px]"
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
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Remarks:</Label>
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
                                        className="w-[200px] h-8 text-xs"
                                        placeholder="Remarks..."
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-500 hover:text-red-700"
                                    onClick={() => onDeleteVendor(v.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}
                        {!isEditingAgenda && (() => {
                            const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                            const startDate = stepDate?.start_date
                            const endDate = stepDate?.end_date

                            return (
                                <div className="text-xs text-muted-foreground">
                                    {startDate && endDate ? `${startDate} to ${endDate}` :
                                        startDate ? `From ${startDate}` :
                                            endDate ? `Until ${endDate}` :
                                                'No dates set'}
                                    {(() => {
                                        const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                        return stepDate?.remarks ? (
                                            <div className="mt-1 text-slate-600 italic">"{stepDate.remarks}"</div>
                                        ) : null
                                    })()}
                                </div>
                            )
                        })()}
                    </div>
                ))}
                {isEditingAgenda && (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add New Vendor Name"
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
