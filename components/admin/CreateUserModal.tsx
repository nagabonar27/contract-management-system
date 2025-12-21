"use client"

import { useState } from "react"
import { createNewUser } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"


// Add the onUserCreated prop type
export default function CreateUserModal({ onUserCreated }: { onUserCreated: () => void }) {
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries()) as any

        try {
            // 1. Call the Server Action to create the user in Supabase
            await createNewUser(data)
            toast.success("User created successfully")

            // 2. Close the modal
            setOpen(false)

            // 3. THIS IS THE KEY: Refresh the parent table's state
            onUserCreated()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" /> Add New User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input id="full_name" name="full_name" placeholder="Rifqy I." required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="admin@maagroup.co.id"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            If left blank, a system email will be generated.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="position">Position</Label>
                        {/* Hidden input to ensure FormData captures the value */}
                        <input type="hidden" name="position" value={position} />
                        <Select name="position" required onValueChange={setPosition}>
                            <SelectTrigger id="position">
                                <SelectValue placeholder="Select a position" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Contract Analyst">Contract Analyst</SelectItem>
                                <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                                <SelectItem value="Procurement & Logistic Division Head">Procurement & Logistic Division Head</SelectItem>
                                <SelectItem value="Data & System Analyst">Data & System Analyst</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create User"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}