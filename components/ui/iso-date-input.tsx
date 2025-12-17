"use client"

import * as React from "react"
import { DateInput } from "@/components/ui/date-input"
import { toDisplayDate, toISODate, validateDateFormat } from "@/lib/dateHelpers"

interface ISODateInputProps {
    value: string | null
    onChange: (isoDate: string) => void
    className?: string
    placeholder?: string
    disabled?: boolean
}

export function ISODateInput({
    value,
    onChange,
    className,
    placeholder,
    disabled
}: ISODateInputProps) {
    // Initial state from prop
    const [displayValue, setDisplayValue] = React.useState(toDisplayDate(value))

    // Sync state if external prop changes to something derived from a DIFFERENT source
    // or if we are initializing.
    // We need to be careful not to overwrite user typing.
    React.useEffect(() => {
        // If the prop value matches what we currently have (in ISO form), don't verify.
        // Only update if they diverge, which implies an external update.
        const currentIso = toISODate(displayValue)
        if (value !== currentIso) {
            setDisplayValue(toDisplayDate(value))
        }
    }, [value]) // We intentionally omit displayValue from deps to avoid circular loop

    const handleChange = (newValue: string) => {
        setDisplayValue(newValue)

        // Only propagate change to parent if it is a COMPLETE and VALID date
        if (newValue.length === 10) {
            const { valid } = validateDateFormat(newValue)
            if (valid) {
                const isoDate = toISODate(newValue)
                if (isoDate) {
                    onChange(isoDate)
                }
            }
        }
    }

    return (
        <DateInput
            value={displayValue}
            onChange={handleChange}
            className={className}
            placeholder={placeholder}
            disabled={disabled}
        />
    )
}
