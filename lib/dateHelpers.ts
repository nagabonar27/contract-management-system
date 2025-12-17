import { format, parse, isValid } from 'date-fns'

/**
 * Convert ISO date (yyyy-mm-dd) to display format (dd-mm-yyyy)
 */
export function toDisplayDate(isoDate: string | null): string {
    if (!isoDate) return ""
    try {
        const date = new Date(isoDate)
        if (!isValid(date)) return ""
        return format(date, 'dd-MM-yyyy')
    } catch {
        return ""
    }
}

/**
 * Convert display format (dd-mm-yyyy) to ISO date (yyyy-mm-dd)
 */
export function toISODate(displayDate: string): string | null {
    if (!displayDate) return null
    try {
        const date = parse(displayDate, 'dd-MM-yyyy', new Date())
        if (!isValid(date)) return null
        return format(date, 'yyyy-MM-dd')
    } catch {
        return null
    }
}

/**
 * Validate date string in dd-mm-yyyy format
 */
export function validateDateFormat(dateString: string): { valid: boolean; error?: string } {
    if (!dateString) return { valid: true } // Empty is valid

    // Check format dd-mm-yyyy
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        return { valid: false, error: "Use dd-mm-yyyy format" }
    }

    // Parse and validate actual date
    const [day, month, year] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    if (date.getDate() !== day ||
        date.getMonth() !== month - 1 ||
        date.getFullYear() !== year) {
        return { valid: false, error: "Invalid date" }
    }

    return { valid: true }
}

/**
 * Format date input as user types (auto-add dashes)
 */
export function formatDateInput(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Add dashes at appropriate positions
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`
}
