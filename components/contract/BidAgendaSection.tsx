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
import { VendorFindingsSubSection } from "./VendorFindingsSubSection"
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
    const renderAgendaRow = (item: AgendaItem, index: number) => {
        const step = item.step_name

        const isClarification = step.toLowerCase() === "clarification meeting"
        const isVendorFindings = step.toLowerCase() === "vendor findings"
        const isAppointedVendor = step.toLowerCase() === "appointed vendor"
        const isRevisedPrice = step.toLowerCase().includes("revised price")
        const isKYC = step.toLowerCase().includes("kyc")
        const isTechEval = step.toLowerCase().includes("technical evaluation")
        const isPrice = step.toLowerCase().includes("price") && !isRevisedPrice

        const isVendorDependent = (isKYC || isTechEval || isPrice || isRevisedPrice || isAppointedVendor || isClarification) && !isVendorFindings

        // Filter vendors for this specific step
        let stepVendors: ContractVendor[] = []

        if (isVendorFindings) {
            stepVendors = vendorList.filter(v => v.agenda_step_id === item.id)
        } else if (isVendorDependent) {
            for (let i = index - 1; i >= 0; i--) {
                // Look backward in the list for Vendor Findings
                if (agendaList[i].step_name === "Vendor Findings") {
                    stepVendors = vendorList.filter(v => v.agenda_step_id === agendaList[i].id)
                    break
                }
            }
        }

        return (
            <React.Fragment key={item.id}>
                <tr className={cn("border-b transition-colors", isEditingAgenda ? "bg-muted/30" : "hover:bg-muted/50")}>
                    <td className="p-4 align-top font-medium pl-8 relative">
                        {/* Indentation Visual */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/10"></div>
                        <div>{item.step_name}</div>
                        {item.status === 'Completed' && !isEditingAgenda && (
                            <Badge className="mt-1 bg-green-500 text-[10px]">Done</Badge>
                        )}
                        {item.status === 'In Progress' && !isEditingAgenda && (
                            <Badge className="mt-1 bg-blue-500 text-[10px]">Active</Badge>
                        )}
                    </td>
                    <td className="p-4 align-top">
                        {(isVendorFindings || isKYC || isClarification || isPrice || isRevisedPrice || isTechEval) ? (
                            <span className="text-muted-foreground text-xs italic">Per vendor</span>
                        ) : (item.step_name === "Contract Completed" || item.step_name === "Completed") ? (
                            isEditingAgenda ? (
                                <div className="flex justify-center w-full">
                                    <DatePicker
                                        className="w-full"
                                        value={item.end_date ? parseISO(item.end_date) : undefined}
                                        onChange={(date) => {
                                            const d = date ? format(date, 'yyyy-MM-dd') : ""
                                            onUpdateAgendaItem(item.id, 'start_date', d)
                                            onUpdateAgendaItem(item.id, 'end_date', d)
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Date: {item.start_date || "-"}</span>
                                </div>
                            )
                        ) : isEditingAgenda ? (
                            <div className="flex justify-center w-full">
                                <DateRangePicker
                                    className="w-full"
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
                                    placeholder="Remarks..."
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
                                    (isVendorFindings || isKYC || isTechEval || isPrice || isRevisedPrice) ? (
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
                                    (isVendorFindings || isKYC || isTechEval || isPrice || isRevisedPrice) ? (
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

                {/* Vendor Findings / Sub-sections */}
                {isVendorFindings && (
                    <tr>
                        <td colSpan={4} className="px-4 pb-4 pt-0 bg-muted/10">
                            <VendorFindingsSubSection
                                item={item}
                                stepVendors={stepVendors}
                                isEditingAgenda={isEditingAgenda}
                                newVendorName={newVendorName}
                                onNewVendorNameChange={onNewVendorNameChange}
                                onAddVendor={onAddVendor}
                                onDeleteVendor={onDeleteVendor}
                                onUpdateVendorData={onUpdateVendorData}
                            />
                        </td>
                    </tr>
                )}

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
    }
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
                <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr className="border-b">
                                <th className="h-10 px-4 text-left font-medium w-1/3">Step</th>
                                <th className="h-10 px-4 text-left font-medium w-[300px]">Timeline</th>
                                <th className="h-10 px-4 text-left font-medium">Remarks</th>
                                {isEditingAgenda && <th className="h-10 px-4 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {agendaList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center">No steps added.</td>
                                </tr>
                            )}
                            {agendaList.map((item, index) => renderAgendaRow(item, index))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
