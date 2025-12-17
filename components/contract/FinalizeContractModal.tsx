import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface FinalizeContractModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contractNumber: string
    effectiveDate: string
    expiryDate: string
    contractSummary?: string
    costSaving?: number
    onContractNumberChange: (value: string) => void
    onEffectiveDateChange: (value: string) => void
    onExpiryDateChange: (value: string) => void
    onContractSummaryChange?: (value: string) => void
    onFinalize: () => void
    isAmendment?: boolean
    referenceContractNumber?: string
    onReferenceNumberChange?: (value: string) => void
}

export function FinalizeContractModal({
    open,
    onOpenChange,
    contractNumber,
    effectiveDate,
    expiryDate,
    contractSummary,
    costSaving,
    onContractNumberChange,
    onEffectiveDateChange,
    onExpiryDateChange,
    onContractSummaryChange,
    onFinalize,
    isAmendment = false,
    referenceContractNumber,
    onReferenceNumberChange,
}: FinalizeContractModalProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isAmendment ? "Finalize Amendment" : "Complete Contract"}
                    </DialogTitle>
                    <DialogDescription>
                        {isAmendment
                            ? "All signatures are completed. Finalize this amendment by adding contract details."
                            : "All signatures are completed. Finalize by adding a Contract Number, Effective Date, and Expiry Date."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Amendment Reference Number */}
                    {isAmendment && onReferenceNumberChange && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reference_number" className="text-right">
                                Reference #
                            </Label>
                            <Input
                                id="reference_number"
                                value={referenceContractNumber || ""}
                                onChange={(e) => onReferenceNumberChange(e.target.value)}
                                placeholder="Original contract number"
                                className="col-span-3"
                            />
                        </div>
                    )}

                    {/* Contract Number */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="contract_number" className="text-right">
                            Contract #
                        </Label>
                        <Input
                            id="contract_number"
                            value={contractNumber}
                            onChange={(e) => onContractNumberChange(e.target.value)}
                            placeholder={isAmendment ? "e.g., C-2024-001-A1" : "e.g., C-2024-001"}
                            className="col-span-3"
                        />
                    </div>

                    {/* Effective Date */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="effective_date" className="text-right">
                            Effective Date
                        </Label>
                        <Input
                            id="effective_date"
                            type="date"
                            value={effectiveDate}
                            onChange={(e) => onEffectiveDateChange(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* Expiry Date */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expiry_date" className="text-right">
                            Expiry Date
                        </Label>
                        <Input
                            id="expiry_date"
                            type="date"
                            value={expiryDate}
                            onChange={(e) => onExpiryDateChange(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* Cost Saving (read-only, auto-calculated) */}
                    {costSaving !== undefined && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">
                                Cost Saving
                            </Label>
                            <div className="col-span-3">
                                <span className={`font-medium ${costSaving > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {costSaving > 0 ? formatCurrency(costSaving) : '-'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Contract Summary */}
                    {onContractSummaryChange && (
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="contract_summary" className="text-right pt-2">
                                Summary
                            </Label>
                            <Textarea
                                id="contract_summary"
                                value={contractSummary || ""}
                                onChange={(e) => onContractSummaryChange(e.target.value)}
                                placeholder="Enter contract summary..."
                                className="col-span-3"
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onFinalize}>
                        Save & Activate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
