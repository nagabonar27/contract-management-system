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
import { ISODateInput } from "@/components/ui/iso-date-input"

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
                                <th className="h-10 px-4 text-left font-medium">Start</th>
                                <th className="h-10 px-4 text-left font-medium">End</th>
                                <th className="h-10 px-4 text-left font-medium">Remarks</th>
                                {isEditingAgenda && <th className="h-10 px-4 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {agendaList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center">No steps added.</td>
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
                                                    isEditingAgenda ? (
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs whitespace-nowrap">Completion Date:</Label>
                                                            <ISODateInput
                                                                value={item.end_date || item.start_date || ""}
                                                                onChange={val => {
                                                                    onUpdateAgendaItem(item.id, 'start_date', val)
                                                                    onUpdateAgendaItem(item.id, 'end_date', val)
                                                                }}
                                                                className="w-[140px] h-8 text-xs"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">{item.end_date || item.start_date || "-"}</span>
                                                    )
                                                ) : isEditingAgenda ? (
                                                    <ISODateInput
                                                        value={item.start_date || ""}
                                                        onChange={val => onUpdateAgendaItem(item.id, 'start_date', val)}
                                                        className="w-[140px] h-8 text-xs"
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">{item.start_date || "-"}</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                {(isVendorFindings || isKYC || isClarification || isPrice || isRevisedPrice) ? (
                                                    <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                ) : item.step_name.includes("Completed") ? (
                                                    <span className="text-muted-foreground text-xs italic">Same as start</span>
                                                ) : isEditingAgenda ? (
                                                    <ISODateInput
                                                        value={item.end_date || ""}
                                                        onChange={val => {
                                                            // Auto-fill start_date if not set
                                                            if (val && (!item.start_date || item.start_date === "")) {
                                                                onUpdateAgendaItem(item.id, 'start_date', val)
                                                            }
                                                            onUpdateAgendaItem(item.id, 'end_date', val)
                                                        }}
                                                        className="w-[140px] h-8 text-xs"
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">{item.end_date || "-"}</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-top">
                                                {isClarification ? (
                                                    <span className="text-muted-foreground text-xs italic">Per vendor</span>
                                                ) : (isAppointedVendor && isEditingAgenda) ? (
                                                    <Select value={item.remarks || ""} onValueChange={val => onUpdateAgendaItem(item.id, 'remarks', val)}>
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
                                                ) : (
                                                    isEditingAgenda ? (
                                                        <Input
                                                            value={item.remarks || ""}
                                                            onChange={e => onUpdateAgendaItem(item.id, 'remarks', e.target.value)}
                                                            className="h-8 text-xs"
                                                            placeholder="Remarks..."
                                                        />
                                                    ) : (
                                                        <span>{item.remarks || "-"}</span>
                                                    )
                                                )}
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
                                                <td colSpan={5} className="px-4 pb-4 pt-0 bg-muted/10">
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
                                                                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Start:</Label>
                                                                                <ISODateInput
                                                                                    value={(() => {
                                                                                        const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                                                                        return stepDate?.start_date || ""
                                                                                    })()}
                                                                                    onChange={val => {
                                                                                        const stepDates = v.step_dates || []
                                                                                        const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === item.id)

                                                                                        let updated
                                                                                        if (existingIndex >= 0) {
                                                                                            updated = [...stepDates]
                                                                                            updated[existingIndex] = { ...updated[existingIndex], start_date: val }
                                                                                        } else {
                                                                                            updated = [...stepDates, {
                                                                                                id: `temp-${Date.now()}`,
                                                                                                vendor_id: v.id,
                                                                                                agenda_step_id: item.id,
                                                                                                start_date: val,
                                                                                                end_date: null
                                                                                            }]
                                                                                        }
                                                                                        onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                                                                    }}
                                                                                    className="w-[140px] h-8 text-xs"
                                                                                />
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Label className="text-xs text-muted-foreground whitespace-nowrap">End:</Label>
                                                                                <ISODateInput
                                                                                    value={(() => {
                                                                                        const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                                                                                        return stepDate?.end_date || ""
                                                                                    })()}
                                                                                    onChange={val => {
                                                                                        const stepDates = v.step_dates || []
                                                                                        const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === item.id)

                                                                                        let updated
                                                                                        if (existingIndex >= 0) {
                                                                                            updated = [...stepDates]
                                                                                            updated[existingIndex] = { ...updated[existingIndex], end_date: val }
                                                                                            // Auto-fill start if not set
                                                                                            if (val && !updated[existingIndex].start_date) {
                                                                                                updated[existingIndex].start_date = val
                                                                                            }
                                                                                        } else {
                                                                                            updated = [...stepDates, {
                                                                                                id: `temp-${Date.now()}`,
                                                                                                vendor_id: v.id,
                                                                                                agenda_step_id: item.id,
                                                                                                start_date: val,
                                                                                                end_date: val
                                                                                            }]
                                                                                        }
                                                                                        onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                                                                    }}
                                                                                    className="w-[140px] h-8 text-xs"
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
