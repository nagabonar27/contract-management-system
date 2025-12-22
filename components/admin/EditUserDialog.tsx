"use client"

import { useState } from "react"
import { resetUserPassword, updateUserInfo } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Settings, UserCog, LockKeyhole } from "lucide-react"
import { toast } from "sonner"

interface EditUserDialogProps {
    user: {
        id: string
        full_name: string
        email: string
        position: string
    }
    onUserUpdated?: () => void
}

export default function EditUserDialog({ user, onUserUpdated }: EditUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Profile State
    const [fullName, setFullName] = useState(user.full_name || "")
    const [position, setPosition] = useState(user.position || "")

    // Password State
    const [newPassword, setNewPassword] = useState("")

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await updateUserInfo(user.id, { full_name: fullName, position })
            toast.success("User profile updated successfully")
            if (onUserUpdated) onUserUpdated()
            setOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await resetUserPassword(user.id, newPassword)
            toast.success("Password reset successfully")
            setNewPassword("") // Clear field
            setOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Edit user</span>
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User: {user.full_name}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>

                    {/* TAB: PROFILE */}
                    <TabsContent value="profile">
                        <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="position">Position</Label>
                                <Select value={position} onValueChange={setPosition}>
                                    <SelectTrigger id="position">
                                        <SelectValue placeholder="Select a position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Contract Analyst">Contract Analyst</SelectItem>
                                        <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                                        <SelectItem value="Procurement & Logistic Division Head">Procurement & Logistic Division Head</SelectItem>
                                        <SelectItem value="Data & System Analyst">Data & System Analyst</SelectItem>
                                        <SelectItem value="Staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* TAB: SECURITY */}
                    <TabsContent value="security">
                        <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                            <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                Warning: Resetting the password will invalidate the user's current session.
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
