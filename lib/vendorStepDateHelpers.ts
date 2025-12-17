// Helper function to get or create step date for a vendor
export function getVendorStepDate(
    vendor: any,
    agendaStepId: string
): { start_date: string | null; end_date: string | null } {
    if (!vendor.step_dates || vendor.step_dates.length === 0) {
        return { start_date: null, end_date: null }
    }

    const stepDate = vendor.step_dates.find(
        (sd: any) => sd.agenda_step_id === agendaStepId
    )

    return stepDate || { start_date: null, end_date: null }
}

// Helper function to update vendor step date in the local state
export function updateVendorStepDate(
    vendor: any,
    agendaStepId: string,
    field: 'start_date' | 'end_date',
    value: string
): any {
    const stepDates = vendor.step_dates || []
    const existingIndex = stepDates.findIndex(
        (sd: any) => sd.agenda_step_id === agendaStepId
    )

    if (existingIndex >= 0) {
        // Update existing step date
        const updated = [...stepDates]
        updated[existingIndex] = {
            ...updated[existingIndex],
            [field]: value
        }
        return { ...vendor, step_dates: updated }
    } else {
        // Create new step date
        const newStepDate = {
            id: `temp-${Date.now()}`, // Temporary ID, will be replaced by database
            vendor_id: vendor.id,
            agenda_step_id: agendaStepId,
            start_date: field === 'start_date' ? value : null,
            end_date: field === 'end_date' ? value : null
        }
        return { ...vendor, step_dates: [...stepDates, newStepDate] }
    }
}
