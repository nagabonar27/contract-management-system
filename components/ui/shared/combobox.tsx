"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export type Option = {
    label: string
    value: string
}

interface ComboboxProps {
    options: Option[]
    value: string // current value (label or value depending on usage)
    onSelect: (value: string) => void
    onCreate?: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    allowCreate?: boolean
}

export function Combobox({
    options,
    value,
    onSelect,
    onCreate,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyMessage = "No item found.",
    allowCreate = false
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedOption = options.find(opt => opt.value === value || opt.label === value)

    const handleCreate = () => {
        if (onCreate && search) {
            onCreate(search)
            setOpen(false)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    {selectedOption ? selectedOption.label : value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
                            {allowCreate && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={handleCreate}
                                >
                                    <Plus className="mr-2 h-3 w-3" /> Create "{search}"
                                </Button>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={(currentValue) => {
                                        // We return the original option value/label
                                        onSelect(option.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
