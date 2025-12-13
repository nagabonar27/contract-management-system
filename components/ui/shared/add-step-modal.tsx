"use client"

import * as React from "react"
import { CalendarIcon, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { BID_AGENDA_STEPS } from "@/lib/constant"

interface AddStepModalProps {
    onSelect: (step: string) => void
}

export function AddStepModal({ onSelect }: AddStepModalProps) {
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    return (
        <>
            <Button
                variant="outline"
                className="justify-between text-muted-foreground"
                onClick={() => setOpen(true)}
            >
                <span className="flex items-center"><Plus className="mr-2 h-4 w-4" /> Add Process Step</span>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Search process step..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Available Steps">
                        {BID_AGENDA_STEPS.map((step) => (
                            <CommandItem
                                key={step}
                                value={step}
                                onSelect={() => {
                                    onSelect(step)
                                    setOpen(false)
                                }}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                <span>{step}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
