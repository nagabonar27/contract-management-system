// components/PasswordResetModal.tsx
"use client"

import { useState } from "react"
import { resetUserPassword } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

export default function PasswordResetModal({ userId, userName }: { userId: string, userName: string }) {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const handleAction = async () => {
        setLoading(true)
        try {
            await resetUserPassword(userId, password)
            setOpen(false)
            alert("Password updated successfully")
        } catch (e) {
            alert("Failed to update")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Reset Password</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Reset Password for {userName}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <Input
                        type="password"
                        placeholder="New password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button className="w-full" onClick={handleAction} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Change
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}