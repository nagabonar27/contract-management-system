import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddStepModal } from "@/components/ui/shared/add-step-modal"
import { Trash2, Pencil, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { VendorEvaluationRows } from "./VendorEvaluationRows"
// import { ISODateInput } from "@/components/ui/iso-date-input"
import { DateRangePicker, DatePicker, DateRange } from "@/components/DatePicker"
import { format, parseISO } from "date-fns"

// Export types for use in other components
export interface AgendaItem {
    id: string
    contract_id: string
    step_name: string
    start_date: string | null
    end_date: string | null
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
    onAddVendor: (stepId: string) => void  // Updated to accept stepId
    onDeleteVendor: (vendorId: string) => void
    onNewVendorNameChange: (value: string) => void
    appointedVendorName?: string | null
    onAppointedVendorChange?: (name: string) => void
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
}: BidAgendaSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Bid Agenda</CardTitle>
                    <div className="flex items-center gap-2">
                        {isEditingAgenda && <AddStepModal onSelect={onAddStep} />}
                        <Button
                            variant={isEditingAgenda ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                if (isEditingAgenda) onSaveAll()
                                else onEditToggle()
                            }}
                            disabled={isSavingAgenda}
                        >
                            {isSavingAgenda ? "Saving..." : isEditingAgenda ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" /> Save Agenda
                                </>
                            ) : (
                                <>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Agenda
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr className="border-b">
                                <th className="h-10 px-4 text-left font-medium w-1/3">Step</th>
                                <th className="h-10 px-4 text-left font-medium w-[300px]">Timeline</th>
                                <th className="h-10 px-4 text-left font-medium">Details / Remarks</th>
                                {isEditingAgenda && <th className="h-10 px-4 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {agendaList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center">No steps added.</td>
                                </tr>
                            )}
                            {agendaList.map((item, index) => {
                                const isClarification = item.step_name.includes("Clarification Meeting")
                                const isVendorFindings = item.step_name === "Vendor Findings"
                                const isAppointedVendor = item.step_name === "Appointed Vendor"
                                const isRevisedPrice = item.step_name.includes("Revised Price")
                                const isKYC = item.step_name.includes("KYC")
                                const isTechEval = item.step_name.includes("Technical Evaluation")
                                const isPrice = item.step_name.includes("Price") && !isRevisedPrice

                                const isVendorDependent = (isKYC || isTechEval || isPrice || isRevisedPrice || isAppointedVendor || isClarification) && !isVendorFindings

                                // Filter vendors for this specific step
                                let stepVendors: ContractVendor[] = []

                                if (isVendorFindings) {
                                    // Vendor Findings step shows its own vendors
                                    stepVendors = vendorList.filter(v => v.agenda_step_id === item.id)
                                } else if (isVendorDependent) {
                                    // For KYC, Tech Eval, Price, etc., find vendors from the most recent preceding Vendor Findings
                                    // Look backwards through agenda to find the last Vendor Findings step before this one
                                    for (let i = index - 1; i >= 0; i--) {
                                        if (agendaList[i].step_name === "Vendor Findings") {
                                            stepVendors = vendorList.filter(v => v.agenda_step_id === agendaList[i].id)
                                            break
                                        }
                                    }
                                }

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr className={cn("border-b transition-colors", isEditingAgenda ? "bg-muted/30" : "hover:bg-muted/50")}>
                                            <td className="p-4 align-top font-medium">
                                                <div>{item.step_name}</div>
                                                {item.status === 'Completed' && !isEditingAgenda && (
                                                    <Badge className="mt-1 bg-green-500 text-[10px]">Done</Badge>
                                                )}
                                                {item.status === 'In Progress' && !isEditingAgenda && (
                                                    <Badge className="mt-1 bg-blue-500 text-[10px]">Active</Badge>
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                {(isVendorFindings || isKYC || isClarification || isPrice || isRevisedPrice) ? (
                                                    <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                ) : item.step_name.includes("Completed") ? (
                                                    // COMPLETED STEP: Use DatePicker (Single)
                                                    isEditingAgenda ? (
                                                        <div className="flex justify-center w-full">
                                                            <DatePicker
                                                                className="w-[240px] mx-auto"
                                                                value={item.end_date ? parseISO(item.end_date) : undefined}
                                                                onChange={(date) => {
                                                                    const d = date ? format(date, 'yyyy-MM-dd') : ""
                                                                    onUpdateAgendaItem(item.id, 'start_date', d)
                                                                    onUpdateAgendaItem(item.id, 'end_date', d)
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-muted-foreground">{item.start_date && item.end_date ? `${item.start_date} - ${item.end_date}` : (item.end_date || item.start_date || "-")}</span>
                                                        </div>
                                                    )
                                                ) : isEditingAgenda ? (
                                                    <div className="flex justify-center w-full">
                                                        <DateRangePicker
                                                            className="w-[240px] mx-auto"
                                                            value={{
                                                                from: item.start_date ? parseISO(item.start_date) : undefined,
                                                                to: item.end_date ? parseISO(item.end_date) : undefined,
                                                            }}
                                                            onChange={(value: DateRange | undefined) => {
                                                                const startDate = value?.from ? format(value.from, 'yyyy-MM-dd') : ""
                                                                const endDate = value?.to ? format(value.to, 'yyyy-MM-dd') : ""
                                                                onUpdateAgendaItem(item.id, 'start_date', startDate)
                                                                onUpdateAgendaItem(item.id, 'end_date', endDate)
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-muted-foreground">Start: {item.start_date || "-"}</span>
                                                        <span className="text-xs text-muted-foreground">End: {item.end_date || "-"}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                {isClarification ? (
                                                    <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                ) : (isAppointedVendor && isEditingAgenda) ? (
                                                    <div className="flex flex-col gap-2">
                                                        <Select value={appointedVendorName || ""} onValueChange={val => onAppointedVendorChange?.(val)}>
                                                            <SelectTrigger className="h-8 w-full text-xs">
                                                                <SelectValue placeholder="Select Appointed Vendor" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {vendorList.filter(v => v.kyc_result === 'Pass').map(v => (
                                                                    <SelectItem key={v.id} value={v.vendor_name}>{v.vendor_name}</SelectItem>
                                                                ))}
                                                                {vendorList.filter(v => v.kyc_result === 'Pass').length === 0 && (
                                                                    <span className="p-2 text-xs text-muted-foreground">No passed vendors</span>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            value={item.remarks || ""}
                                                            onChange={e => onUpdateAgendaItem(item.id, 'remarks', e.target.value)}
                                                            className="h-8 text-xs"
                                                            placeholder="Remarks (e.g. Approved by Board)..."
                                                        />
                                                    </div>
                                                ) : (
                                                    isAppointedVendor ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="font-semibold text-xs text-blue-600">Winner: {appointedVendorName || "-"}</div>
                                                            <span className="text-xs text-muted-foreground">{item.remarks}</span>
                                                        </div>
                                                    ) : (
                                                        isEditingAgenda ? (
                                                            isVendorFindings ? (
                                                                <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                            ) : (
                                                                <Input
                                                                    value={item.remarks || ""}
                                                                    onChange={e => onUpdateAgendaItem(item.id, 'remarks', e.target.value)}
                                                                    className="h-8 text-xs"
                                                                    placeholder="Remarks..."
                                                                />
                                                            )
                                                        ) : (
                                                            isVendorFindings ? (
                                                                <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                            ) : (
                                                                <span>{item.remarks || "-"}</span>
                                                            )
                                                        )
                                                    ))}
                                            </td>
                                            {isEditingAgenda && (
                                                <td className="p-4 align-top text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        onClick={() => onDeleteStep(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>

                                        {/* Vendor Findings Sub-Section */}
                                        {isVendorFindings && (
                                            <tr>
                                                <td colSpan={4} className="px-4 pb-4 pt-0 bg-muted/10">
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
                                                                                    placeholder="Vendor remarks..."
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
                                                </td>
                                            </tr>
                                        )}

                                        {/* Vendor Evaluation Sub-Rows */}
                                        {isVendorDependent && stepVendors.length > 0 && (
                                            <VendorEvaluationRows
                                                agendaItem={item}
                                                vendorList={stepVendors}
                                                isEditingAgenda={isEditingAgenda}
                                                onUpdateVendorData={onUpdateVendorData}
                                                onUpdateAgendaItem={onUpdateAgendaItem}
                                            />
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
