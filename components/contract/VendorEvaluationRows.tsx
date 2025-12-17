import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Pencil, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatNumber, parseNumber } from "@/lib/contractUtils"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group"
import { ISODateInput } from "@/components/ui/iso-date-input"

// Import types from BidAgendaSection to avoid duplication
import type { AgendaItem, ContractVendor } from "./BidAgendaSection"

interface VendorEvaluationRowsProps {
    agendaItem: AgendaItem
    vendorList: ContractVendor[]
    isEditingAgenda: boolean
    onUpdateVendorData: (vendorId: string, field: keyof ContractVendor, value: any) => void
    onUpdateAgendaItem?: (itemId: string, field: keyof AgendaItem, value: string) => void
}

export function VendorEvaluationRows({
    agendaItem,
    vendorList,
    isEditingAgenda,
    onUpdateVendorData,
    onUpdateAgendaItem,
}: VendorEvaluationRowsProps) {
    const isClarification = agendaItem.step_name.includes("Clarification Meeting")
    const isKYC = agendaItem.step_name.includes("KYC")
    const isTechEval = agendaItem.step_name.includes("Technical Evaluation")
    const isPrice = agendaItem.step_name.includes("Price") && !agendaItem.step_name.includes("Revised")
    const isRevisedPrice = agendaItem.step_name.includes("Revised Price")
    const isAppointedVendor = agendaItem.step_name === "Appointed Vendor"

    if (isAppointedVendor) return null

    // Helper to get step date for vendor
    const getStepDate = (vendor: ContractVendor, field: 'start_date' | 'end_date') => {
        const stepDate = vendor.step_dates?.find(sd => sd.agenda_step_id === agendaItem.id)
        return stepDate?.[field] || ""
    }

    // Helper to update step date
    const updateStepDate = (vendor: ContractVendor, field: 'start_date' | 'end_date', value: string) => {
        const stepDates = vendor.step_dates || []
        const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === agendaItem.id)

        let updated
        if (existingIndex >= 0) {
            // Update existing step date
            updated = [...stepDates]
            updated[existingIndex] = { ...updated[existingIndex], [field]: value }
        } else {
            // Create new step date entry
            updated = [...stepDates, {
                id: `temp-${Date.now()}`,
                vendor_id: vendor.id,
                agenda_step_id: agendaItem.id,
                start_date: field === 'start_date' ? value : null,
                end_date: field === 'end_date' ? value : null
            }]
        }

        // Use 'as any' because the parent expects string but we're passing an array for step_dates
        onUpdateVendorData(vendor.id, 'step_dates' as any, updated)
    }

    return (
        <tr>
            <td colSpan={5} className="px-4 pb-4 pt-0 bg-muted/10">
                <div className="p-4 border border-t-0 rounded-b-md space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-semibold">Vendor Evaluations: {agendaItem.step_name}</h4>
                    </div>
                    <div className="grid gap-2">
                        {vendorList.map(v => {
                            let field: keyof ContractVendor | null = null
                            if (isKYC) field = "kyc_note"
                            if (isTechEval) field = "tech_eval_note"
                            if (isPrice) field = "price_note"
                            if (isRevisedPrice) field = "revised_price_note"
                            // Clarification just uses dates, maybe notes later? For now no specific note field in schema, reuse remarks? 
                            // Using kyc_note as a placeholder if needed, but for now just dates.

                            // Skip failed vendors for tech eval and price (but maybe allow clarification?)
                            if ((isTechEval || isPrice || isRevisedPrice) && v.kyc_result === 'Fail') return null

                            const displayValue = field ? (v[field] || "-") : "-"
                            const revisedValue = (isRevisedPrice && (v.revised_price_note === null || v.revised_price_note === undefined))
                                ? v.price_note
                                : (field ? v[field] : "")

                            return (
                                <div key={v.id} className="flex items-center gap-2">
                                    <div className="w-[200px] text-sm font-medium truncate" title={v.vendor_name}>
                                        {v.vendor_name}
                                    </div>

                                    {/* READ ONLY MODE */}
                                    {!isEditingAgenda && (
                                        <div className="flex-1 flex items-center justify-between text-sm text-gray-700 bg-white p-1 px-2 border rounded">
                                            <span>
                                                {isKYC ? (v.kyc_result || "Pending") + (displayValue !== "-" ? ` - ${displayValue}` : "") :
                                                    isTechEval ? (v.tech_eval_score ? `Score: ${v.tech_eval_score}` : "") + (v.tech_eval_note ? ` - ${v.tech_eval_note}` : "") :
                                                        (isPrice || isRevisedPrice) ? `IDR ${formatNumber(revisedValue || "0")}` :
                                                            isClarification ? (
                                                                (() => {
                                                                    const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                                    return sd ? `${sd.start_date || "?"} - ${sd.end_date || "?"}` : "No dates set"
                                                                })()
                                                            ) :
                                                                displayValue}
                                            </span>
                                            {isRevisedPrice && (() => {
                                                const original = parseFloat(v.price_note || "0")
                                                const revised = parseFloat(revisedValue || "0")
                                                const diff = original - revised
                                                if (!v.price_note && !revisedValue) return null

                                                return (
                                                    <span className={cn("text-xs font-medium ml-2", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                        {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    )}

                                    {/* EDIT MODE */}
                                    {isEditingAgenda && (
                                        <>
                                            {/* Unified Date Inputs for KYC, Clarification, Price, Revised Price */}
                                            {(isKYC || isClarification || isPrice || isRevisedPrice) && (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Start:</Label>
                                                        <ISODateInput
                                                            value={getStepDate(v, 'start_date')}
                                                            onChange={val => updateStepDate(v, 'start_date', val)}
                                                            className="w-[140px] h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-muted-foreground whitespace-nowrap">End:</Label>
                                                        <ISODateInput
                                                            value={getStepDate(v, 'end_date')}
                                                            onChange={val => {
                                                                // Auto-fill start if not set
                                                                if (val && !getStepDate(v, 'start_date')) {
                                                                    updateStepDate(v, 'start_date', val)
                                                                }
                                                                updateStepDate(v, 'end_date', val)
                                                            }}
                                                            className="w-[140px] h-8 text-xs"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* KYC Specifics */}
                                            {isKYC && (
                                                <>
                                                    <Select value={v.kyc_result || ""} onValueChange={val => onUpdateVendorData(v.id, 'kyc_result', val)}>
                                                        <SelectTrigger className="h-8 w-[100px] text-xs bg-white">
                                                            <SelectValue placeholder="Status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Pass">Pass</SelectItem>
                                                            <SelectItem value="Fail">Fail</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        value={v.kyc_note || ""}
                                                        onChange={e => onUpdateVendorData(v.id, 'kyc_note', e.target.value)}
                                                        className="h-8 flex-1 text-xs bg-white"
                                                        placeholder="KYC notes..."
                                                    />
                                                </>
                                            )}

                                            {/* PRICE & REVISED PRICE Specifics */}
                                            {(isPrice || isRevisedPrice) && (
                                                <>
                                                    <div className="flex-1 flex items-center gap-2">
                                                        {isRevisedPrice && <span className="text-xs text-muted-foreground whitespace-nowrap">Revised:</span>}
                                                        <InputGroup className="h-8 flex-1">
                                                            <InputGroupAddon><InputGroupText>IDR</InputGroupText></InputGroupAddon>
                                                            <InputGroupInput
                                                                className="h-8 text-xs bg-white"
                                                                placeholder={isRevisedPrice ? formatNumber(v.price_note || "0") : "0"}
                                                                value={formatNumber(isRevisedPrice ? (revisedValue || "") : (v[field!] || ""))}
                                                                onChange={e => {
                                                                    const val = parseNumber(e.target.value)
                                                                    onUpdateVendorData(v.id, field!, val)
                                                                }}
                                                            />
                                                        </InputGroup>
                                                        {isRevisedPrice && (() => {
                                                            const original = parseFloat(v.price_note || "0")
                                                            const revised = parseFloat(revisedValue || "0")
                                                            const diff = original - revised
                                                            if (!v.price_note && !revisedValue) return null
                                                            return (
                                                                <span className={cn("text-xs font-medium whitespace-nowrap", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                                    {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                </>
                                            )}

                                            {/* TECH EVAL: Score + Notes */}
                                            {isTechEval && (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={v.tech_eval_score || ""}
                                                        onChange={e => onUpdateVendorData(v.id, 'tech_eval_score', e.target.value)}
                                                        className="h-8 w-[100px] text-xs bg-white"
                                                        placeholder="Score"
                                                    />
                                                    <Input
                                                        value={v.tech_eval_note || ""}
                                                        onChange={e => onUpdateVendorData(v.id, 'tech_eval_note', e.target.value)}
                                                        className="h-8 flex-1 text-xs bg-white"
                                                        placeholder="Technical evaluation notes..."
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </td>
        </tr>
    )
}
