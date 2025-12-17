/**
 * Format number with thousands separator (Indonesian format)
 * @param val - String number to format
 * @returns Formatted string with dots as thousands separator
 */
export function formatNumber(val: string): string {
    if (!val) return ""
    const number = val.replace(/\D/g, "")
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Parse formatted number back to plain number string
 * @param val - Formatted number string
 * @returns Plain number string without separators
 */
export function parseNumber(val: string): string {
    return val.replace(/\./g, "")
}

/**
 * Format currency in Indonesian Rupiah
 * @param value - Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value)
}

/**
 * Calculate price difference between original and revised price
 * @param originalPrice - Original price string
 * @param revisedPrice - Revised price string
 * @returns Object with difference, percentage, and isSaving flag
 */
export function calculatePriceDifference(
    originalPrice: string | null,
    revisedPrice: string | null
): {
    difference: number
    percentage: number
    isSaving: boolean
} {
    const original = parseFloat(originalPrice || "0")
    const revised = parseFloat(revisedPrice || originalPrice || "0")
    const difference = original - revised
    const percentage = original > 0 ? (difference / original) * 100 : 0

    return {
        difference,
        percentage,
        isSaving: difference > 0,
    }
}

/**
 * Get display status for contract based on dates and agenda
 * @param status - Current contract status
 * @param expiryDate - Contract expiry date
 * @param agendaList - List of agenda items
 * @returns Display status string
 */
export function getContractDisplayStatus(
    status: string,
    expiryDate: string | null,
    agendaList: Array<{ step_name: string; start_date: string | null; end_date: string | null }>
): string {
    const now = new Date()

    // Check Expiry First
    if (expiryDate && new Date(expiryDate) < now) {
        return "Expired"
    }

    // Active / Completed
    if (status === 'Active' || status === 'Completed') return status

    // Ready to Finalize? - Check if BOTH signature steps are completed
    const internalSign = agendaList.find(s => s.step_name === "Internal Contract Signature Process")
    const vendorSign = agendaList.find(s => s.step_name === "Vendor Contract Signature Process")

    const internalDone = internalSign?.end_date && internalSign.end_date !== ""
    const vendorDone = vendorSign?.end_date && vendorSign.end_date !== ""

    if (internalDone && vendorDone) {
        return "Ready to Finalize"
    }

    return "On Progress"
}

/**
 * Calculate days until expiry
 * @param expiryDate - Contract expiry date
 * @returns Number of days until expiry (negative if expired)
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
    if (!expiryDate) return null

    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
}

/**
 * Get badge variant based on days until expiry
 * @param daysUntilExpiry - Number of days until expiry
 * @returns Badge variant string
 */
export function getExpiryBadgeVariant(daysUntilExpiry: number | null): 'destructive' | 'default' | 'secondary' {
    if (daysUntilExpiry === null) return 'secondary'
    if (daysUntilExpiry < 0) return 'destructive'
    if (daysUntilExpiry < 30) return 'destructive'
    if (daysUntilExpiry < 60) return 'default'
    return 'secondary'
}
