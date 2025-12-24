"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MoreVertical, Eye, FileEdit, Trash2 } from "lucide-react"

interface ContractActionsMenuProps {
    contractId: string
    type: 'ongoing' | 'active'

    // Actions
    onAmend?: () => void
    onFinish?: () => void
    onDelete: () => Promise<void> | void

    // State / Permissions
    isAmendDisabled?: boolean
    canDelete: boolean
}

export function ContractActionsMenu({
    contractId,
    type,
    onAmend,
    onFinish,
    onDelete,
    isAmendDisabled = false,
    canDelete
}: ContractActionsMenuProps) {
    const router = useRouter()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Handle initial delete click (open dialog)
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row click
        setIsDeleteDialogOpen(true)
    }

    // Handle confirmed delete
    const handleConfirmDelete = async () => {
        try {
            setIsDeleting(true)
            await onDelete()
        } finally {
            setIsDeleting(false)
            setIsDeleteDialogOpen(false)
        }
    }

    return (
        <>
            <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem onClick={() => router.push(`/bid-agenda/${contractId}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open Bid Agenda
                        </DropdownMenuItem>

                        {/* Active / Expiring Specific Actions */}
                        {type === 'active' && !isAmendDisabled && (
                            <>
                                <DropdownMenuItem onClick={() => onAmend?.()}>
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Amend
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onFinish?.()}>
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Finish
                                </DropdownMenuItem>
                            </>
                        )}

                        {/* Delete Action - Restricted by canDelete prop */}
                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDeleteClick}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the contract and all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
