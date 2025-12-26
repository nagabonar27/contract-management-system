"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ExtendContractModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentExpiryDate: string
    onExtend: (newExpiryDate: string) => void
}

export function ExtendContractModal({
    open,
    onOpenChange,
    currentExpiryDate,
    onExtend
}: ExtendContractModalProps) {
    const [newExpiry, setNewExpiry] = useState(currentExpiryDate)

    const handleSave = () => {
        onExtend(newExpiry)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Extend Contract</DialogTitle>
                    <DialogDescription>
                        Update the expiry date to extend the contract duration.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="expiry_date">New Expiry Date</Label>
                        <Input
                            id="expiry_date"
                            type="date"
                            value={newExpiry}
                            onChange={(e) => setNewExpiry(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Confirm Extension</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
