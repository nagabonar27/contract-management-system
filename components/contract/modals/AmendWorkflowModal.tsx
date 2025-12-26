"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface AmendWorkflowModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contractTitle: string
    onConfirm: (reason: string) => void
    isCreating: boolean
}

export function AmendWorkflowModal({
    open,
    onOpenChange,
    contractTitle,
    onConfirm,
    isCreating
}: AmendWorkflowModalProps) {
    const [reason, setReason] = useState<string>("")

    const handleConfirm = () => {
        if (!reason) return
        onConfirm(reason)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Amend Contract</DialogTitle>
                    <DialogDescription>
                        Initiate an amendment for <b>{contractTitle}</b>. This will create a new contract version.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amendment-reason">Amendment Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="amendment-reason">
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Contract Extension">Contract Extension</SelectItem>
                                <SelectItem value="Changing Scope">Changing Scope</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!reason || isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Amendment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
