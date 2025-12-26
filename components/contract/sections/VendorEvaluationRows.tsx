import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { format, parseISO, differenceInCalendarDays } from "date-fns"

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
    const isOther = !isKYC && !isTechEval && !isPrice && !isRevisedPrice && !isClarification && !isAppointedVendor

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
                    <div key={v.id} className="bg-white border border-border-light dark:border-border-dark rounded-lg shadow-sm overflow-hidden mb-3">
                        {/* Header: Vendor Name + KYC Badge */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border-light dark:border-border-dark">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{v.vendor_name}</span>
                                    {isKYC && !isEditingAgenda && v.kyc_result && (
                                        <Badge variant={v.kyc_result === 'Pass' ? 'outline' : v.kyc_result === 'Fail' ? 'destructive' : 'outline'}
                                            className={cn("h-5 px-1.5 text-[10px]", v.kyc_result === 'Pass' && "bg-green-100 text-green-800 hover:bg-green-100 border-green-200")}
                                        >
                                            {v.kyc_result}
                                        </Badge>
                                    )}
                                </div>
                                {!isEditingAgenda && (() => {
                                    const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                    if (sd?.start_date && sd?.end_date) {
                                        const s = parseISO(sd.start_date)
                                        const e = parseISO(sd.end_date)
                                        const dur = differenceInCalendarDays(e, s) + 1
                                        return (
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                {dur} Days | {sd.start_date} - {sd.end_date}
                                            </span>
                                        )
                                    }
                                    return <span className="text-xs text-muted-foreground mt-0.5">-</span>
                                })()}
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* DATES ROW */}
                            {/* DATES ROW - Only show in Edit Mode (View mode in header) */}
                            {isEditingAgenda && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold w-[60px] shrink-0">Dates</Label>
                                    <div className="w-auto">
                                        {(isKYC || isClarification || isPrice || isRevisedPrice || isTechEval || isOther) && (
                                            <DateRangePicker
                                                className="w-[240px]"
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
                                                        updated = [...stepDates, { id: `temp-${Date.now()}`, vendor_id: v.id, agenda_step_id: agendaItem.id, start_date: startDate, end_date: endDate }]
                                                    }
                                                    onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* REMARKS / SCORE / PRICE ROW */}
                            <div className="flex flex-col gap-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    {isPrice ? "Price" : (isTechEval ? "Score / Note" : "Remarks")}
                                </Label>
                                <div className="text-sm">
                                    {isEditingAgenda ? (
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
                                                            let colorClass = "bg-slate-100 text-slate-600"
                                                            if (diff > 0) colorClass = "bg-green-100 text-green-700"
                                                            if (diff < 0) colorClass = "bg-red-100 text-red-700"
                                                            return (
                                                                <div className={cn("px-2 py-1 rounded text-xs font-mono font-medium shrink-0 min-w-[80px] text-right", colorClass)}>
                                                                    {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                    {isRevisedPrice && v.price_note && (
                                                        <div className="text-xs text-muted-foreground pl-[3.5rem] flex justify-between">
                                                            <span>Original: IDR {formatNumber(v.price_note)}</span>
                                                        </div>
                                                    )}
                                                    {/* Generic Remarks for Price */}
                                                    <Textarea
                                                        value={(() => {
                                                            const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                            return sd?.remarks || ""
                                                        })()}
                                                        onChange={e => {
                                                            const val = e.target.value
                                                            const stepDates = v.step_dates || []
                                                            const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === agendaItem.id)
                                                            let updated
                                                            if (existingIndex >= 0) {
                                                                updated = [...stepDates]
                                                                updated[existingIndex] = { ...updated[existingIndex], remarks: val }
                                                            } else {
                                                                updated = [...stepDates, { id: `temp-${Date.now()}`, vendor_id: v.id, agenda_step_id: agendaItem.id, start_date: null, end_date: null, remarks: val }]
                                                            }
                                                            onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                                        }}
                                                        className="min-h-[80px] w-full text-sm bg-white mt-1"
                                                        placeholder="Add remarks..."
                                                    />
                                                </div>
                                            )}

                                            {/* Other / Generic Steps */}
                                            {isOther && (
                                                <Textarea
                                                    value={(() => {
                                                        const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                        return sd?.remarks || ""
                                                    })()}
                                                    onChange={e => {
                                                        const val = e.target.value
                                                        const stepDates = v.step_dates || []
                                                        const existingIndex = stepDates.findIndex(sd => sd.agenda_step_id === agendaItem.id)
                                                        let updated
                                                        if (existingIndex >= 0) {
                                                            updated = [...stepDates]
                                                            updated[existingIndex] = { ...updated[existingIndex], remarks: val }
                                                        } else {
                                                            updated = [...stepDates, { id: `temp-${Date.now()}`, vendor_id: v.id, agenda_step_id: agendaItem.id, start_date: null, end_date: null, remarks: val }]
                                                        }
                                                        onUpdateVendorData(v.id, 'step_dates' as any, updated)
                                                    }}
                                                    className="min-h-[80px] w-full text-sm bg-white"
                                                    placeholder="Add remarks..."
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        /* READ ONLY MODE */
                                        <div className="min-h-[36px] py-1">
                                            {isKYC ? (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed px-1">
                                                    {displayValue !== "-" ? displayValue : "No remarks provided."}
                                                </p>
                                            ) : isTechEval ? (
                                                <div className="flex flex-col gap-2">
                                                    {v.tech_eval_score && <Badge variant="outline" className="w-fit">Score: {v.tech_eval_score}</Badge>}
                                                    {v.tech_eval_note && (
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed px-1">
                                                            {v.tech_eval_note}
                                                        </p>
                                                    )}
                                                    {!v.tech_eval_note && <p className="text-sm text-muted-foreground italic px-1">No remarks provided.</p>}
                                                </div>
                                            ) : (isPrice || isRevisedPrice) ? (
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="flex items-center gap-2 w-full justify-between h-9">
                                                        <span className="font-mono text-sm">IDR {formatNumber(revisedValue || "0")}</span>
                                                        {isRevisedPrice && (() => {
                                                            const original = parseFloat(v.price_note || "0")
                                                            const revised = parseFloat(revisedValue || "0")
                                                            const diff = original - revised
                                                            let colorClass = "bg-slate-100 text-slate-600"
                                                            if (diff > 0) colorClass = "bg-green-100 text-green-700"
                                                            if (diff < 0) colorClass = "bg-red-100 text-red-700"
                                                            return (
                                                                <span className={cn("text-xs font-mono font-medium ml-2 px-1.5 py-0.5 rounded", colorClass)}>
                                                                    {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                    {(() => {
                                                        const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                        return sd?.remarks ? (
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed px-1">
                                                                {sd.remarks}
                                                            </p>
                                                        ) : null
                                                    })()}
                                                </div>
                                            ) : isClarification ? (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed px-1">
                                                    {v.tech_eval_remarks || "No remarks provided."}
                                                </p>
                                            ) : isOther ? (
                                                (() => {
                                                    const sd = v.step_dates?.find(d => d.agenda_step_id === agendaItem.id)
                                                    return (
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed px-1">
                                                            {sd?.remarks || "No remarks provided."}
                                                        </p>
                                                    )
                                                })()
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </>
    )
}
