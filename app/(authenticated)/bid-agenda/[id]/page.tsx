"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { toast } from "sonner"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { getContractDisplayStatus } from "@/lib/contractUtils"
import { BID_AGENDA_STEPS } from "@/lib/constant"
import { ContractService } from "@/services/contractService"
import { ContractHeader } from "@/components/contract/ContractHeader"
import { BidAgendaSection } from "@/components/contract/BidAgendaSection"
import type { AgendaItem, ContractVendor } from "@/components/contract/BidAgendaSection"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"
import { GanttChart } from "@/components/contract/GanttChart"
import { ExtendContractModal } from "@/components/contract/ExtendContractModal"
import type { Option } from "@/components/ui/shared/combobox"

// Types
type ContractData = {
    id: string
    title: string
    contract_number: string | null
    category: string | null
    division: string | null
    department: string | null
    contract_type_id: number | null
    version: number | undefined
    pt_id: number | null
    effective_date: string | null
    expiry_date: string | null
    current_step: string
    pt: { name: string } | null
    contract_types: { name: string } | null
    profiles: { full_name: string } | null
    status: string
    is_cr: boolean | null
    is_on_hold: boolean | null
    is_anticipated: boolean | null
    appointed_vendor: string | null
    created_by: string | null
    created_at: string | null
}


export default function ContractDetailPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClientComponentClient()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [userPosition, setUserPosition] = useState<string | null>(null)
    const [contract, setContract] = useState<ContractData | null>(null)
    const [agendaList, setAgendaList] = useState<AgendaItem[]>([])
    const [vendorList, setVendorList] = useState<ContractVendor[]>([])

    // Global Edit State
    const [isEditingAgenda, setIsEditingAgenda] = useState(false)
    const [isSavingAgenda, setIsSavingAgenda] = useState(false)

    // Finalize / Contract Number State
    const [showFinalizeModal, setShowFinalizeModal] = useState(false)
    const [finalizeMode, setFinalizeMode] = useState<'finish' | 'amend'>('finish')
    const [hasAmendmentInProgress, setHasAmendmentInProgress] = useState(false)
    const [finalizeContractNumber, setFinalizeContractNumber] = useState("")
    const [finalizeEffectiveDate, setFinalizeEffectiveDate] = useState("")
    const [finalizeExpiryDate, setFinalizeExpiryDate] = useState("")
    const [finalizeContractSummary, setFinalizeContractSummary] = useState("")
    const [finalizeReferenceNumber, setFinalizeReferenceNumber] = useState("")

    // Extend Contract State
    const [showExtendModal, setShowExtendModal] = useState(false)

    // Vendor Findings Input (New candidate)
    const [newVendorName, setNewVendorName] = useState("")
    const [appointedVendorName, setAppointedVendorName] = useState<string | null>(null)


    // Options
    const [categoryOptions] = useState<Option[]>([
        { label: "Persetujuan Teknis", value: "Persetujuan Teknis" },
        { label: "Rent", value: "rent" },
        { label: "Exploration", value: "exploration" },
        { label: "General Services", value: "general_services" },
        { label: "Consulting", value: "consulting" },
        { label: "Consignment", value: "consignment" },
        { label: "Layanan Kesehatan", value: "layanan_kesehatan" },
        { label: "Rehab DAS", value: "rehab_das" },
        { label: "Pengeboran Inti", value: "pengeboran_inti" },
        { label: "Jasa Logistik", value: "jasa_logistik" },
        { label: "Geolistrik", value: "geolistrik" },
        { label: "Pest Control", value: "pest_control" },
    ])
    const [ptOptions, setPtOptions] = useState<Option[]>([])
    const [typeOptions, setTypeOptions] = useState<Option[]>([])
    const [userOptions, setUserOptions] = useState<Option[]>([])

    // Edit Header State
    const [isEditingHeader, setIsEditingHeader] = useState(false)
    const [editForm, setEditForm] = useState({
        title: "",
        category: "",
        division: "",
        department: "",
        pt_id: 0,
        pt_name: "",
        contract_type_id: 0,
        contract_type_name: "",
        effective_date: "",
        expiry_date: "",
        created_by: "",
        created_at: ""
    })

    // Status checkboxes state
    const [isCR, setIsCR] = useState(false)
    const [isOnHold, setIsOnHold] = useState(false)
    const [isAnticipated, setIsAnticipated] = useState(false)

    // Status Logic
    const displayStatus = getContractDisplayStatus(contract?.status || "", contract?.expiry_date || null, agendaList)
    const isActive = displayStatus === 'Active' || displayStatus === 'Completed' || displayStatus === 'Expired'
    const isReadyToFinalize = displayStatus === 'Ready to Finalize'

    // Derive Appointed Vendor from Vendor List (Single Source of Truth)
    // We prioritize the vendor explicitly marked as appointed in the vendors table.
    useEffect(() => {
        if (vendorList.length > 0) {
            const appointed = vendorList.find(v => v.is_appointed)
            if (appointed) {
                setAppointedVendorName(appointed.vendor_name)
            } else {
                // Keep strictly synced with vendor flags
                // If we are editing, we might have a selection pending save, but for display, 
                // if no vendor is appointed in DB (vendorList), and we are not editing, it should be null.
                // However, setAppointedVendorName is also the input state. 
                // We should validly reset it if we just fetched fresh data and nothing is appointed.
                // But we must be careful not to overwrite user input during edit.
                // Since this runs on [vendorList, contract], it runs on fetch.
                if (!isEditingAgenda) {
                    setAppointedVendorName(null)
                }
            }
        }
    }, [vendorList, isEditingAgenda])


    // --- DATA LOADING ---
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('profiles').select('position').eq('id', user.id).single()
                if (data) setUserPosition(data.position)
            }
        }
        fetchUser()
    }, [])

    const fetchAgenda = async () => {
        const { data } = await supabase.from('contract_bid_agenda').select('*').eq('contract_id', id)
        return data || []
    }

    const fetchVendors = async () => {
        const { data } = await supabase
            .from('contract_vendors')
            .select(`
                *,
                step_dates:vendor_step_dates(*)
            `)
            .eq('contract_id', id)
            .order('created_at', { ascending: true })
        return data || []
    }

    // MAIN FETCH
    useEffect(() => {
        const fetchData = async () => {
            if (!id) return
            setLoading(true)

            try {
                // 1. Fetch Contract via Service
                const contractData = await ContractService.getContract(supabase, id)

                if (!contractData) {
                    toast.error("Contract not found")
                    setLoading(false)
                    return
                }

                const mappedContract: ContractData = {
                    id: contractData.id,
                    title: contractData.title,
                    contract_number: contractData.contract_number || null,
                    category: contractData.category || null,
                    division: contractData.division || null,
                    department: contractData.department || null,
                    contract_type_id: contractData.contract_type_id || null,
                    version: contractData.version || undefined,
                    pt_id: contractData.pt_id || null,
                    effective_date: contractData.effective_date || null,
                    expiry_date: contractData.expiry_date || null,
                    current_step: contractData.current_step || "",
                    status: contractData.status,
                    pt: contractData.pt || null,
                    contract_types: contractData.contract_types || null,
                    profiles: contractData.profiles || null,
                    is_cr: contractData.is_cr || false,
                    is_on_hold: contractData.is_on_hold || false,
                    is_anticipated: contractData.is_anticipated || false,
                    appointed_vendor: contractData.appointed_vendor || null,
                    created_by: contractData.created_by || null,
                    created_at: contractData.parent_created_at || null
                }

                setContract(mappedContract)
                // setAppointedVendorName(mappedContract.appointed_vendor) // MOVED to verify against vendor list first

                // Finalize Modal Defaults
                setFinalizeContractNumber(mappedContract.contract_number || "")
                setFinalizeEffectiveDate(mappedContract.effective_date || "")
                setFinalizeExpiryDate(mappedContract.expiry_date || "")

                // Edit Form Defaults
                setEditForm({
                    title: mappedContract.title,
                    category: mappedContract.category || "",
                    division: mappedContract.division || "",
                    department: mappedContract.department || "",
                    pt_id: mappedContract.pt_id || 0,
                    pt_name: mappedContract.pt?.name || "",
                    contract_type_id: mappedContract.contract_type_id || 0,
                    contract_type_name: mappedContract.contract_types?.name || "",
                    effective_date: mappedContract.effective_date || "",
                    expiry_date: mappedContract.expiry_date || "",
                    created_by: mappedContract.created_by || "",
                    created_at: mappedContract.created_at ? new Date(mappedContract.created_at).toISOString().split('T')[0] : ""
                })

                // Status Flags
                setIsCR(mappedContract.is_cr || false)
                setIsOnHold(mappedContract.is_on_hold || false)
                setIsAnticipated(mappedContract.is_anticipated || false)

                // 2. Fetch Child Data (Agenda & Vendors)
                const agendaData = await fetchAgenda()
                const vendorsData = await fetchVendors()

                // Set Vendors
                setVendorList(vendorsData)
                const appointed = vendorsData.find((v: any) => v.is_appointed)
                if (appointed) {
                    setAppointedVendorName(appointed.vendor_name)
                }

                // Sort Agenda by Effective Date (Own or Vendor)
                const sortedAgenda = agendaData.sort((a: any, b: any) => {
                    const getEffectiveDate = (item: any) => {
                        if (item.start_date) return new Date(item.start_date).getTime()

                        // Look for vendor dates
                        const relatedDates = vendorsData
                            .flatMap((v: any) => v.step_dates || [])
                            .filter((sd: any) => sd.agenda_step_id === item.id && sd.start_date)

                        if (relatedDates.length > 0) {
                            // Earliest start date among vendors for this step
                            const timestamps = relatedDates.map((rd: any) => new Date(rd.start_date).getTime())
                            return Math.min(...timestamps)
                        }
                        return 0
                    }

                    const dateA = getEffectiveDate(a)
                    const dateB = getEffectiveDate(b)

                    if (dateA > 0 && dateB > 0) return dateA - dateB
                    if (dateA > 0) return -1 // A has date, B doesn't -> A first
                    if (dateB > 0) return 1  // B has date, A doesn't -> B first

                    // Fallback to Created At
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                })
                setAgendaList(sortedAgenda)

                // 3. Fetch Options (Fixed Mapping: Value = ID)
                const { data: ptData } = await supabase.from('pt').select('id, name')
                if (ptData) setPtOptions(ptData.map(p => ({ label: p.name, value: p.id.toString() })))

                const { data: typeData } = await supabase.from('contract_types').select('id, name')
                if (typeData) setTypeOptions(typeData.map(t => ({ label: t.name, value: t.id.toString() })))

                const { data: profileData } = await supabase.from('profiles').select('id, full_name').order('full_name')
                if (profileData) setUserOptions(profileData.map(p => ({ label: p.full_name || "Unknown", value: p.id })))

            } catch (error) {
                console.error("Error loading contract:", error)
                toast.error("Failed to load contract details")
            } finally {
                setLoading(false)
            }
        }

        fetchData()

    }, [id])

    // --- HEADER ACTIONS ---
    const handleRevertContract = async () => {
        if (!confirm("Are you sure you want to REVERT this contract to 'On Progress'?")) return

        const { error } = await supabase.from('contract_versions').update({
            status: 'On Progress'
        }).eq('id', id)

        if (error) {
            toast.error("Failed to revert", { description: error.message })
        } else {
            setContract(prev => prev ? { ...prev, status: 'On Progress' } : null)
            toast.success("Contract reverted to 'On Progress'!")
        }
    }

    const handleSaveHeader = async () => {
        if (!contract) return

        try {
            const updates: any = {
                title: editForm.title,
                category: editForm.category,
                division: editForm.division,
                department: editForm.department,
                effective_date: (isActive && editForm.effective_date) ? editForm.effective_date : contract.effective_date,
                expiry_date: (isActive && editForm.expiry_date) ? editForm.expiry_date : contract.expiry_date,
                is_cr: isCR,
                is_on_hold: isOnHold,
                is_anticipated: isAnticipated,
                created_by: editForm.created_by,
                parent_created_at: editForm.created_at,
            }

            // Resolve IDs from Names or IDs in editForm
            const ptOption = ptOptions.find(o => o.label === editForm.pt_name) || ptOptions.find(o => o.value === editForm.pt_name)
            if (ptOption) updates.pt_id = parseInt(ptOption.value)

            const typeOption = typeOptions.find(o => o.label === editForm.contract_type_name) || typeOptions.find(o => o.value === editForm.contract_type_name)
            if (typeOption) updates.contract_type_id = parseInt(typeOption.value)

            // NO LONGER UPDATING appointed_vendor HERE
            // It is managed via Agenda / Vendor Selection solely.

            const updated = await ContractService.updateContract(supabase, id, updates)

            setContract(prev => prev ? {
                ...prev,
                ...updated,
                pt: updated.pt || prev.pt,
                contract_types: updated.contract_types || prev.contract_types
            } as any : null)

            toast.success("Contract details updated")
            setIsEditingHeader(false)

        } catch (error: any) {
            console.error("Update failed:", error)
            toast.error("Failed to update contract", { description: error.message })
        }
    }

    // --- AGENDA MANAGEMENT (Implementing BidAgendaSection Props) ---

    // 1. Add Step
    const handleAddStep = (stepName: string) => {
        const newStep: AgendaItem = {
            id: `temp-${Date.now()}`, // Temp ID, will be real DB ID on save
            contract_id: id,
            step_name: stepName,
            status: 'Pending',
            start_date: null,
            end_date: null,
            remarks: "",
            created_at: new Date().toISOString()
        }
        setAgendaList(prev => [...prev, newStep])
    }

    // 2. Delete Step
    const handleDeleteStep = async (stepId: string) => {
        if (stepId.startsWith('temp-')) {
            // Just remove from state
            setAgendaList(prev => prev.filter(s => s.id !== stepId))
            return
        }

        if (confirm("Are you sure you want to delete this step? This will also delete associated vendor dates.")) {
            const stepToDelete = agendaList.find(s => s.id === stepId)

            // Optimistic update
            setAgendaList(prev => prev.filter(s => s.id !== stepId))

            // Manual Cascade: Delete dependencies
            await supabase.from('vendor_step_dates').delete().eq('agenda_step_id', stepId)
            await supabase.from('contract_vendors').delete().eq('agenda_step_id', stepId)

            // If deleting "Appointed Vendor" step, clear the appointed vendor from contract
            if (stepToDelete?.step_name === "Appointed Vendor") {
                // 1. Clear is_appointed flag on ALL vendors for this contract
                await supabase.from('contract_vendors')
                    .update({ is_appointed: false })
                    .eq('contract_id', id)

                // Update local state
                // setContract(prev => prev ? { ...prev, appointed_vendor: null } : null) // Deprecated
                setAppointedVendorName(null)
                // Also update local vendor list to clear flags
                setVendorList(prev => prev.map(v => ({ ...v, is_appointed: false })))
            }

            // 3. Delete the Step
            const { error } = await supabase.from('contract_bid_agenda').delete().eq('id', stepId)

            if (error) {
                toast.error("Failed to delete step")
                fetchAgenda() // Revert
                fetchVendors() // Revert vendors too
            } else {
                toast.success("Step deleted")
                // Also update local vendor list to remove deleted vendors if any
                setVendorList(prev => prev.filter(v => v.agenda_step_id !== stepId))
            }
        }
    }

    // 3. Update Agenda Item (Local State)
    const handleUpdateAgendaItem = (itemId: string, field: keyof AgendaItem, value: string) => {
        setAgendaList(prev => prev.map(item => {
            if (item.id === itemId) return { ...item, [field]: value }
            return item
        }))
    }

    // 4. Update Vendor Data (Local State - Deep Update)
    const handleUpdateVendorData = (vendorId: string, field: keyof ContractVendor, value: any) => {
        setVendorList(prev => prev.map(v => {
            if (v.id === vendorId) return { ...v, [field]: value }
            return v
        }))
    }

    // 5. Add Vendor Candidate
    const handleAddVendor = (stepId: string) => {
        if (!newVendorName.trim()) {
            toast.error("Please enter a vendor name")
            return
        }

        const newVendor: ContractVendor = {
            id: `temp-vendor-${Date.now()}`,
            contract_id: id,
            vendor_name: newVendorName,
            agenda_step_id: stepId, // Linked to the Vendor Findings step
            start_date: null,
            end_date: null,
            kyc_result: null,
            kyc_note: null,
            tech_eval_note: null,
            tech_eval_score: null,
            tech_eval_remarks: null,
            price_note: null,
            revised_price_note: null,
            created_at: new Date().toISOString(),
            step_dates: []
        }

        setVendorList(prev => [...prev, newVendor])
        setNewVendorName("")
    }

    // 6. Delete Vendor
    const handleDeleteVendor = async (vendorId: string) => {
        if (vendorId.startsWith('temp-')) {
            setVendorList(prev => prev.filter(v => v.id !== vendorId))
            return
        }

        if (confirm("Delete this vendor candidate?")) {
            setVendorList(prev => prev.filter(v => v.id !== vendorId))
            const { error } = await supabase.from('contract_vendors').delete().eq('id', vendorId)
            if (error) {
                toast.error("Failed to delete vendor")
                fetchVendors()
            }
        }
    }

    // Helper: Determine Current Step from Agenda Statuses
    const determineCurrentStep = (items: AgendaItem[], vendors: ContractVendor[]): string => {
        // 1. Priority: Explicitly 'On Progress'
        const onProgress = items.find(i => i.status === 'On Progress')
        if (onProgress) return onProgress.step_name

        // 2. Priority: Latest Active Step by Date (Including Vendor Dates)
        // Find all steps that are NOT Completed and have a Start Date (either own or from vendor)
        const activeWithDates = items.filter(i =>
            i.status !== 'Completed' &&
            i.status !== 'Finished'
        ).map(item => {
            // Check own date
            let latestDate = item.start_date ? new Date(item.start_date).getTime() : 0

            // Check vendor dates for this step
            if (vendors && vendors.length > 0) {
                vendors.forEach(v => {
                    const stepDate = v.step_dates?.find(sd => sd.agenda_step_id === item.id)
                    if (stepDate?.start_date) {
                        const vTime = new Date(stepDate.start_date).getTime()
                        if (vTime > latestDate) latestDate = vTime
                    }
                })
            }

            return {
                ...item,
                effectiveDate: latestDate
            }
        }).filter(item => item.effectiveDate > 0)

        if (activeWithDates.length > 0) {
            // Sort by Date Descending (Latest first)
            activeWithDates.sort((a, b) => b.effectiveDate - a.effectiveDate)
            return activeWithDates[0].step_name
        }

        // 3. Fallback: First 'Pending' step based on Canonical Order
        // Sort by canonical order
        const sorted = [...items].sort((a, b) => {
            const indexA = BID_AGENDA_STEPS.indexOf(a.step_name as any)
            const indexB = BID_AGENDA_STEPS.indexOf(b.step_name as any)
            const valA = indexA === -1 ? 999 : indexA
            const valB = indexB === -1 ? 999 : indexB
            return valA - valB
        })

        for (const item of sorted) {
            if (item.status === 'Pending') return item.step_name
        }

        // 4. All Completed?
        if (sorted.length > 0 && sorted.every(s => s.status === 'Completed')) {
            return "Contract Completed"
        }

        // 5. Absolute Default
        if (sorted.length > 0) return sorted[0].step_name

        return "Initiated"
    }

    // 7. Save All (Agenda + Vendors)
    const handleSaveAll = async () => {
        setIsSavingAgenda(true)
        // Map to track temp IDs to real IDs for Agenda Steps
        const stepIdMap: Record<string, string> = {}
        // Map to track temp IDs to real IDs for Vendors
        const vendorIdMap: Record<string, string> = {}

        try {
            // A. Save Agenda Items
            const savedAgendaList: AgendaItem[] = [] // Track latest state for step calc

            for (const item of agendaList) {
                const isTemp = item.id.startsWith('temp-')
                const originalId = item.id

                const payload = {
                    contract_id: id,
                    step_name: item.step_name,
                    status: item.status,
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
                    remarks: item.remarks || null,
                }

                let savedItem = { ...item }

                if (isTemp) {
                    const { data, error } = await supabase.from('contract_bid_agenda').insert(payload).select().single()
                    if (!error && data) {
                        stepIdMap[originalId] = data.id
                        // Update local object to prevent re-insert if we save again without reload
                        item.id = data.id
                        savedItem = { ...item, ...data } // Ensure we have the latest
                    } else if (error) {
                        throw error
                    }
                } else {
                    const { error } = await supabase.from('contract_bid_agenda').update(payload).eq('id', item.id)
                    if (error) throw error
                }
                savedAgendaList.push(savedItem)
            }

            // B. Save Vendors
            // We need to track the latest vendor list state for calculation too
            // Ideally we should construct the full object but for calculation purposes we mostly need step_dates
            // Since step_dates logic below modifies the DB but not the local `vendorList` object explicitly in a way that matches `savedAgendaList` structure perfectly immediately unless we are careful.
            // Actually, `vendorList` in state is updated via `setVendorList` reference but we need the *latest* data including new attributes.
            // However, `determineCurrentStep` relies on `vendorList` state or the inputs.
            // Let's rely on the current `vendorList` state (which has user edits) PLUS any ID updates we made.
            // BUT, `vendorList` in loop B is just loop variable.

            // To render the correct state for `determineCurrentStep`, we should probably just use `vendorList` (the state) 
            // because `determineCurrentStep` needs to know the DATES, which come from the user input in `vendorList` state.
            // The updates to DB just confirm them.

            // Wait, we need to map temp step IDs to real IDs in vendor list if we want to be 100% correct, 
            // but for `determineCurrentStep` matching `agendaItem.id`, we need consistent IDs.
            // If `savedAgendaList` has real IDs, and `vendorList` has temp IDs for steps, they won't match in `determineCurrentStep`.
            // We need to fix this linkage for the calculation.

            const savedVendorList: ContractVendor[] = []

            // Filter vendors that are linked to finding steps
            for (const v of vendorList) {
                const isTemp = v.id.startsWith('temp-')
                const originalVendorId = v.id

                // Resolve Agenda Step ID (Handle temp IDs)
                const resolvedStepId = (v.agenda_step_id && v.agenda_step_id.startsWith('temp-'))
                    ? stepIdMap[v.agenda_step_id] || v.agenda_step_id // Use mapped or original (if somehow failed/not found)
                    : v.agenda_step_id

                // Update local obj for consistency
                const currentV = { ...v, agenda_step_id: resolvedStepId }

                // If resolvedStepId is still a temp ID (mapping failed), skip or error?
                // It will fail DB constraint, caught by catch block.

                const payload = {
                    contract_id: id,
                    vendor_name: v.vendor_name,
                    agenda_step_id: resolvedStepId || null,
                    kyc_result: v.kyc_result,
                    kyc_note: v.kyc_note,
                    tech_eval_note: v.tech_eval_note,
                    tech_eval_score: v.tech_eval_score,
                    tech_eval_remarks: v.tech_eval_remarks,
                    price_note: v.price_note,
                    revised_price_note: v.revised_price_note,
                    is_appointed: v.vendor_name === appointedVendorName
                }

                if (isTemp) {
                    const { data, error } = await supabase.from('contract_vendors').insert(payload).select().single()
                    if (!error && data) {
                        vendorIdMap[originalVendorId] = data.id
                        v.id = data.id
                        currentV.id = data.id
                    } else if (error) {
                        throw error
                    }
                } else {
                    const { error } = await supabase.from('contract_vendors').update(payload).eq('id', v.id)
                    if (error) throw error
                }

                // C. Save Vendor Step Dates
                const savedStepDates = []
                if (v.step_dates) {
                    for (const sd of v.step_dates) {
                        // Resolve Vendor ID (Use mapped ID if the vendor was just created)
                        // Note: v.id is already updated above in the object reference.
                        const resolvedVendorId = v.id

                        // Resolve Agenda Step ID for the date entry
                        const resolvedStepIdForDate = (sd.agenda_step_id && sd.agenda_step_id.startsWith('temp-'))
                            ? stepIdMap[sd.agenda_step_id] || sd.agenda_step_id
                            : sd.agenda_step_id

                        const sdPayload = {
                            vendor_id: resolvedVendorId,
                            agenda_step_id: resolvedStepIdForDate,
                            start_date: sd.start_date || null,
                            end_date: sd.end_date || null,
                            remarks: sd.remarks
                        }

                        // We strictly need to link this back for `determineCurrentStep` to work with real IDs
                        savedStepDates.push({ ...sd, agenda_step_id: resolvedStepIdForDate })

                        if (sd.id.startsWith('temp-')) {
                            // We don't really need to track step date IDs for dependencies
                            await supabase.from('vendor_step_dates').insert(sdPayload)
                        } else {
                            await supabase.from('vendor_step_dates').update(sdPayload).eq('id', sd.id)
                        }
                    }
                }
                currentV.step_dates = savedStepDates // Use updated IDs
                savedVendorList.push(currentV)
            }

            // D. UPDATE CURRENT STEP ON CONTRACT
            // Re-calculate based on the just-saved agenda list AND saved vendor list (with corrected IDs)
            const newCurrentStep = determineCurrentStep(savedAgendaList, savedVendorList)
            if (newCurrentStep !== contract?.current_step) {
                await ContractService.updateContract(supabase, id, { current_step: newCurrentStep })
                // Optimistic update of contract state
                setContract(prev => prev ? { ...prev, current_step: newCurrentStep } : null)
            }

            toast.success("All changes saved")
            setIsEditingAgenda(false)
            // Full refresh to ensure IDs and state are clean
            fetchAgenda()
            fetchVendors()

        } catch (error: any) {
            console.error("Save failed:", error)
            toast.error("Failed to save changes", { description: error.message })
        } finally {
            setIsSavingAgenda(false)
        }
    }


    // 8. Finalize Handler
    const handleFinalize = async () => {
        if (!contract) return

        try {
            const updates: any = {
                contract_number: finalizeContractNumber,
                effective_date: finalizeEffectiveDate,
                expiry_date: finalizeExpiryDate,
                contract_summary: finalizeContractSummary,
            }

            // Both regular finish and amendment finalization should result in an 'Active' contract
            updates.status = 'Active'

            await ContractService.updateContract(supabase, id, updates)

            toast.success(finalizeMode === 'finish' ? "Contract finished!" : "Amendment finalized!")
            setShowFinalizeModal(false)

            // Refresh
            window.location.reload()

        } catch (error: any) {
            console.error("Finalize error:", error)
            toast.error("Failed to finalize", { description: error.message })
        }
    }

    // 9. Extend Handler
    const handleExtend = async (newDate: string) => {
        try {
            await ContractService.updateContract(supabase, id, { expiry_date: newDate } as any)
            toast.success("Contract extended")
            setShowExtendModal(false)
            setContract(prev => prev ? { ...prev, expiry_date: newDate } : null)
        } catch (error: any) {
            console.error("Extend error:", error)
            toast.error("Failed to extend", { description: error.message })
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center space-x-2">
                    <Link href="/contractmanagement?tab=ongoing">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Contract Details</h2>
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-6">
                    <ContractHeader
                        contract={contract}
                        displayStatus={displayStatus}
                        isActive={isActive}
                        isReadyToFinalize={isReadyToFinalize}
                        isEditingHeader={isEditingHeader}
                        editForm={editForm}
                        categoryOptions={categoryOptions}
                        ptOptions={ptOptions}
                        typeOptions={typeOptions}
                        userOptions={userOptions}
                        userPosition={userPosition}
                        appointedVendorName={appointedVendorName}
                        onEditToggle={() => setIsEditingHeader(!isEditingHeader)}
                        onFormChange={(updates) => setEditForm(prev => ({ ...prev, ...updates }))}
                        onSave={handleSaveHeader}
                        onFinish={() => {
                            setFinalizeMode('finish')
                            setShowFinalizeModal(true)
                        }}
                        onAmend={() => {
                            if (hasAmendmentInProgress) {
                                toast.error("An amendment is already in progress for this contract.")
                                return
                            }
                            setFinalizeMode('amend')
                            setShowFinalizeModal(true)
                        }}
                        onExtend={() => setShowExtendModal(true)}
                        onRevert={handleRevertContract}
                        isCR={isCR}
                        isOnHold={isOnHold}
                        isAnticipated={isAnticipated}
                        onStatusChange={(field, val) => {
                            if (field === 'is_cr') setIsCR(val)
                            if (field === 'is_on_hold') setIsOnHold(val)
                            if (field === 'is_anticipated') setIsAnticipated(val)
                        }}
                        hasAmendmentInProgress={hasAmendmentInProgress}
                    />

                    {/* BID AGENDA SECTION */}
                    <BidAgendaSection
                        agendaList={agendaList}
                        vendorList={vendorList}
                        isEditingAgenda={isEditingAgenda}
                        isSavingAgenda={isSavingAgenda}
                        newVendorName={newVendorName}
                        onEditToggle={() => setIsEditingAgenda(!isEditingAgenda)}
                        onSaveAll={handleSaveAll}
                        onAddStep={handleAddStep}
                        onDeleteStep={handleDeleteStep}
                        onUpdateAgendaItem={handleUpdateAgendaItem}
                        onUpdateVendorData={handleUpdateVendorData}
                        onAddVendor={handleAddVendor}
                        onDeleteVendor={handleDeleteVendor}
                        onNewVendorNameChange={setNewVendorName}
                        appointedVendorName={appointedVendorName}
                        onAppointedVendorChange={setAppointedVendorName}
                    />

                    {/* GANTT CHART */}
                    <GanttChart
                        agendaItems={agendaList}
                        vendorItems={vendorList}
                    />

                    {/* MODALS */}
                    <FinalizeContractModal
                        open={showFinalizeModal}
                        onOpenChange={setShowFinalizeModal}
                        contractNumber={finalizeContractNumber}
                        effectiveDate={finalizeEffectiveDate}
                        expiryDate={finalizeExpiryDate}
                        contractSummary={finalizeContractSummary}
                        onContractNumberChange={setFinalizeContractNumber}
                        onEffectiveDateChange={setFinalizeEffectiveDate}
                        onExpiryDateChange={setFinalizeExpiryDate}
                        onContractSummaryChange={setFinalizeContractSummary}
                        onFinalize={handleFinalize}
                        isAmendment={finalizeMode === 'amend'}
                        referenceContractNumber={finalizeReferenceNumber}
                        onReferenceNumberChange={setFinalizeReferenceNumber}
                    />

                    <ExtendContractModal
                        open={showExtendModal}
                        onOpenChange={setShowExtendModal}
                        currentExpiryDate={contract?.expiry_date || ""}
                        onExtend={handleExtend}
                    />
                </div>
            )}
        </div>
    )
}
