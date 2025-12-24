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
    const original = parseFloat(parseNumber(originalPrice || "0"))
    const revised = parseFloat(parseNumber(revisedPrice || originalPrice || "0"))
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

/**
 * Get color class for division badge
 * @param div - Division abbreviation
 * @returns Tailwind CSS class string
 */
const PALETTE_COLORS = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-green-100 text-green-800 border-green-200",
    "bg-red-100 text-red-800 border-red-200",
    "bg-yellow-100 text-yellow-800 border-yellow-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-indigo-100 text-indigo-800 border-indigo-200",
    "bg-pink-100 text-pink-800 border-pink-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-lime-100 text-lime-800 border-lime-200",
    "bg-amber-100 text-amber-800 border-amber-200"
]

const CHART_COLORS = [
    "#2563eb", // Blue
    "#16a34a", // Green
    "#dc2626", // Red
    "#ca8a04", // Yellow
    "#9333ea", // Purple
    "#0891b2", // Cyan
    "#ea580c", // Orange
    "#4f46e5", // Indigo
    "#db2777", // Pink
    "#059669", // Emerald
    "#65a30d", // Lime
    "#d97706"  // Amber
]

/**
 * Get hex color for string (used for charts)
 * @param str - Input string
 * @returns Hex color string
 */
export function getColorForString(str: string | null): string {
    if (!str) return "#94a3b8" // Slate 400

    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % CHART_COLORS.length
    return CHART_COLORS[index]
}

/**
 * Get color class for division badge
 * @param div - Division abbreviation
 * @returns Tailwind CSS class string
 */
export const getDivisionColor = (div: string | null) => {
    if (!div) return 'bg-slate-100 text-slate-800 border-slate-200'

    const normalized = div.toUpperCase().trim()

    const colorMap: Record<string, string> = {
        'TECH': 'bg-blue-100 text-blue-800 border-blue-200',
        'HRGA': 'bg-pink-100 text-pink-800 border-pink-200',
        'FIN': 'bg-emerald-100 text-emerald-800 border-emerald-200',
        'LGL': 'bg-purple-100 text-purple-800 border-purple-200',
        'PROC': 'bg-orange-100 text-orange-800 border-orange-200',
        'OPS': 'bg-cyan-100 text-cyan-800 border-cyan-200',
        'EXT': 'bg-lime-100 text-lime-800 border-lime-200',
        'PLNT': 'bg-amber-100 text-amber-800 border-amber-200',
        'MGMT': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }

    if (colorMap[normalized]) {
        return colorMap[normalized]
    }

    // Fallback: Generate consistent color hash
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
        hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % PALETTE_COLORS.length
    return PALETTE_COLORS[index]
}

/**
 * Get color class for version badge
 * @param version - Version number
 * @returns Tailwind CSS class string
 */
export const getVersionBadgeColor = (version: number) => {
    switch (version) {
        case 1: return "bg-gray-100 text-gray-800 border-gray-200"
        case 2: return "bg-blue-100 text-blue-800 border-blue-200"
        case 3: return "bg-green-100 text-green-800 border-green-200"
        case 4: return "bg-orange-100 text-orange-800 border-orange-200"
        case 5: return "bg-red-100 text-red-800 border-red-200"
        default: return "bg-purple-100 text-purple-800 border-purple-200"
    }
}
