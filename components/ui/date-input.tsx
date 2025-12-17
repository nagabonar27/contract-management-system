"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatDateInput, validateDateFormat } from "@/lib/dateHelpers"

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string
    onChange: (value: string) => void
    error?: string
}

export function DateInput({ value, onChange, error, className, ...props }: DateInputProps) {
    const [localError, setLocalError] = React.useState("")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDateInput(e.target.value)

        // Only allow up to 10 characters (dd-mm-yyyy)
        if (formatted.length > 10) return

        onChange(formatted)

        // Validate when complete
        if (formatted.length === 10) {
            const validation = validateDateFormat(formatted)
            setLocalError(validation.error || "")
        } else {
            setLocalError("")
        }
    }

    const displayError = error || localError

    return (
        <div className="space-y-1">
            <Input
                {...props}
                type="text"
                value={value}
                onChange={handleChange}
                placeholder="dd-mm-yyyy"
                className={cn(
                    displayError && "border-red-500",
                    className
                )}
                maxLength={10}
            />
            {displayError && (
                <p className="text-xs text-red-500">{displayError}</p>
            )}
        </div>
    )
}
