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
// import { ISODateInput } from "@/components/ui/iso-date-input" // Removing unused
import { DateRangePicker, DateRange } from "@/components/DatePicker"
import { format, parseISO } from "date-fns"

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
    const step = agendaItem.step_name.toLowerCase()
    const isClarification = step.includes("clarification meeting")
    const isKYC = step.includes("kyc")
    const isTechEval = step.includes("tech eval") || step.includes("technical evaluation")
    const isPrice = step.includes("price") && !step.includes("revised")
    const isRevisedPrice = step.includes("revised price")
    const isAppointedVendor = step === "appointed vendor"

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
        <>
            {vendorList.map(v => {
                let field: keyof ContractVendor | null = null
                if (isKYC) field = "kyc_note"
                if (isTechEval) field = "tech_eval_note"
                if (isPrice) field = "price_note"
                if (isRevisedPrice) field = "revised_price_note"

                // Skip failed vendors for tech eval and price (but maybe allow clarification?)
                if ((isTechEval || isPrice || isRevisedPrice) && v.kyc_result === 'Fail') return null

                const displayValue = field ? (v[field] || "-") : "-"
                const revisedValue = (isRevisedPrice && (v.revised_price_note === null || v.revised_price_note === undefined))
                    ? v.price_note
                    : (field ? v[field] : "")

                return (
                    <tr key={v.id} className={cn("border-b hover:bg-muted/50 transition-colors group", isEditingAgenda ? "bg-white" : "bg-muted/5")}>
                        {/* 1. Step / Vendor Name Column */}
                        <td className="p-4 align-top">
                            <div className="flex items-center gap-2 pl-6 border-l-2 border-l-slate-200 h-9">
                                <div className="text-sm font-medium text-slate-700" title={v.vendor_name}>
                                    {v.vendor_name}
                                </div>
                                {isKYC && !isEditingAgenda && v.kyc_result && (
                                    <Badge variant={v.kyc_result === 'Pass' ? 'outline' : v.kyc_result === 'Fail' ? 'destructive' : 'outline'}
                                        className={cn("h-5 px-1.5 text-[10px]", v.kyc_result === 'Pass' && "bg-green-100 text-green-800 hover:bg-green-100 border-green-200")}
                                    >
                                        {v.kyc_result}
                                    </Badge>
                                )}
                            </div>
                        </td>

                        {/* 2. Timeline Column */}
                        <td className="p-4 align-top">
                            {/* READ ONLY MODE */}
                            {!isEditingAgenda && (
                                <div className="text-sm text-slate-600 flex flex-col justify-center h-9">
                                    {isKYC ? (
                                        <div className="flex flex-col gap-2">
                                            {(() => {
                                                const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                return sd ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-muted-foreground">Start: {sd.start_date || "?"}</span>
                                                        <span className="text-xs text-muted-foreground">End: {sd.end_date || "?"}</span>
                                                    </div>
                                                ) : <div className="text-xs text-muted-foreground">-</div>
                                            })()}
                                        </div>
                                    ) :
                                        (isClarification || isTechEval || isPrice || isRevisedPrice) ? (() => {
                                            const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                            return sd ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">Start: {sd.start_date || "?"}</span>
                                                    <span className="text-xs text-muted-foreground">End: {sd.end_date || "?"}</span>
                                                </div>
                                            ) : <div className="text-center">-</div>
                                        })() : "-"
                                    }
                                </div>
                            )}

                            {/* EDIT MODE */}
                            {isEditingAgenda && (
                                <div className="flex justify-center w-full">
                                    {(isKYC || isClarification || isPrice || isRevisedPrice || isTechEval) && (
                                        <DateRangePicker
                                            className="w-full"
                                            value={{
                                                from: getStepDate(v, 'start_date') ? parseISO(getStepDate(v, 'start_date')) : undefined,
                                                to: getStepDate(v, 'end_date') ? parseISO(getStepDate(v, 'end_date')) : undefined,
                                            }}
                                            onChange={(val: DateRange | undefined) => {
                                                const startDate = val?.from ? format(val.from, 'yyyy-MM-dd') : ""
                                                const endDate = val?.to ? format(val.to, 'yyyy-MM-dd') : ""

                                                const stepDates = v.step_dates || []
                                                const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === agendaItem.id)

                                                let updated
                                                if (existingIndex >= 0) {
                                                    updated = [...stepDates]
                                                    updated[existingIndex] = { ...updated[existingIndex], start_date: startDate, end_date: endDate }
                                                } else {
                                                    updated = [...stepDates, {
                                                        id: `temp-${Date.now()}`,
                                                        vendor_id: v.id,
                                                        agenda_step_id: agendaItem.id,
                                                        start_date: startDate,
                                                        end_date: endDate
                                                    }]
                                                }
                                                onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </td>

                        {/* 3. Remarks Column (Inputs for Note/Score/Price) */}
                        <td className="p-4 align-top">
                            {/* READ ONLY MODE */}
                            {!isEditingAgenda && (
                                <div className="text-sm h-9 flex items-center">
                                    {isKYC ? (displayValue !== "-" ? displayValue : "") :
                                        isTechEval ? (
                                            <div className="flex items-center gap-2">
                                                {v.tech_eval_score && <Badge variant="outline">Score: {v.tech_eval_score}</Badge>}
                                                <span>{v.tech_eval_note}</span>
                                            </div>
                                        ) :
                                            (isPrice || isRevisedPrice) ? (
                                                <div className="flex items-center gap-2 w-full justify-between">
                                                    <span className="font-mono">IDR {formatNumber(revisedValue || "0")}</span>
                                                    {isRevisedPrice && (() => {
                                                        const original = parseFloat(v.price_note || "0")
                                                        const revised = parseFloat(revisedValue || "0")
                                                        const diff = original - revised

                                                        let colorClass = "bg-slate-100 text-slate-600"
                                                        if (diff > 0) colorClass = "bg-green-100 text-green-700" // Saving
                                                        if (diff < 0) colorClass = "bg-red-100 text-red-700" // Expensive

                                                        return (
                                                            <span className={cn("text-xs font-mono font-medium ml-2 px-1.5 py-0.5 rounded", colorClass)}>
                                                                {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                            </span>
                                                        )
                                                    })()}
                                                </div>
                                            ) :
                                                isClarification ? (v.tech_eval_remarks || "-") :
                                                    displayValue}
                                </div>
                            )}

                            {/* EDIT MODE */}
                            {isEditingAgenda && (
                                <div className="flex flex-col gap-2 w-full">
                                    {/* KYC Specifics */}
                                    {isKYC && (
                                        <div className="flex gap-2">
                                            <Select value={v.kyc_result || ""} onValueChange={val => onUpdateVendorData(v.id, 'kyc_result', val)}>
                                                <SelectTrigger className="h-9 w-[100px] text-xs bg-white shrink-0">
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
                                                className="h-9 w-full text-xs bg-white"
                                                placeholder="Remarks..."
                                            />
                                        </div>
                                    )}

                                    {/* Clarification */}
                                    {isClarification && (
                                        <Input
                                            value={v.tech_eval_remarks || ""}
                                            onChange={e => onUpdateVendorData(v.id, 'tech_eval_remarks', e.target.value)}
                                            className="h-9 w-full text-xs bg-white"
                                            placeholder="Remarks..."
                                        />
                                    )}

                                    {/* TECH EVAL */}
                                    {isTechEval && (
                                        <div className="flex gap-2 items-center w-full">
                                            <div className="relative w-[100px] shrink-0">
                                                <Input
                                                    type="number"
                                                    value={v.tech_eval_score || ""}
                                                    onChange={e => onUpdateVendorData(v.id, 'tech_eval_score', e.target.value)}
                                                    className="h-9 w-full text-xs bg-white pr-8 text-right"
                                                    placeholder="0"
                                                    min={0}
                                                    max={100}
                                                />
                                                <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">/ 100</span>
                                            </div>
                                            <Input
                                                value={v.tech_eval_note || ""}
                                                onChange={e => onUpdateVendorData(v.id, 'tech_eval_note', e.target.value)}
                                                className="h-9 w-full text-xs bg-white"
                                                placeholder="Remarks..."
                                            />
                                        </div>
                                    )}

                                    {/* PRICE & REVISED PRICE */}
                                    {(isPrice || isRevisedPrice) && (
                                        <div className="space-y-2 w-full">
                                            <div className="flex items-center gap-2">
                                                {isRevisedPrice && <span className="text-xs font-medium w-12 shrink-0">Revised:</span>}
                                                <InputGroup className="h-9 w-full">
                                                    <InputGroupAddon><InputGroupText>IDR</InputGroupText></InputGroupAddon>
                                                    <InputGroupInput
                                                        className="h-9 text-xs bg-white font-mono"
                                                        placeholder="0"
                                                        value={formatNumber(isRevisedPrice ? (revisedValue || "") : (v[field!] || ""))}
                                                        onChange={e => {
                                                            const val = parseNumber(e.target.value)
                                                            onUpdateVendorData(v.id, field!, val)
                                                        }}
                                                    />
                                                </InputGroup>
                                                {isRevisedPrice && (() => {
                                                    const original = parseFloat(v.price_note || "0")
                                                    const current = parseFloat(revisedValue || "0")
                                                    const diff = original - current

                                                    let colorClass = "bg-slate-100 text-slate-600" // Zero
                                                    if (diff > 0) colorClass = "bg-green-100 text-green-700"
                                                    if (diff < 0) colorClass = "bg-red-100 text-red-700"

                                                    return (
                                                        <div className={cn("px-2 py-1 rounded text-xs font-mono font-medium shrink-0 min-w-[80px] text-right", colorClass)}>
                                                            {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                            {/* Previous Price Context for Revised */}
                                            {isRevisedPrice && v.price_note && (
                                                <div className="text-xs text-muted-foreground pl-[3.5rem] flex justify-between">
                                                    <span>Original: IDR {formatNumber(v.price_note)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </td>

                        {/* 4. Action Column (Empty) */}
                        {isEditingAgenda && <td className="p-4 align-top"></td>}
                    </tr>
                )
            })}
        </>
    )
}
