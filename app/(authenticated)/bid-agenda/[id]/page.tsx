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
        created_by: ""
    })

    // Status checkboxes state
    const [isCR, setIsCR] = useState(false)
    const [isOnHold, setIsOnHold] = useState(false)
    const [isAnticipated, setIsAnticipated] = useState(false)

    // Status Logic
    const displayStatus = getContractDisplayStatus(contract?.status || "", contract?.expiry_date || null, agendaList)
    const isActive = displayStatus === 'Active' || displayStatus === 'Completed' || displayStatus === 'Expired'
    const isReadyToFinalize = displayStatus === 'Ready to Finalize'
    // Derive Appointed Vendor from Agenda (if not saved in DB yet)
    // const derivedAppointedVendor = agendaList.find(item => item.step_name === "Appointed Vendor")?.remarks || contract?.appointed_vendor

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
        if (data) {
            const sorted = data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            setAgendaList(sorted)
        }
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
        if (data) setVendorList(data)
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
                    created_by: contractData.created_by || null
                }

                setContract(mappedContract)
                setAppointedVendorName(mappedContract.appointed_vendor) // Init local state

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
                    created_by: mappedContract.created_by || ""
                })

                // Status Flags
                setIsCR(mappedContract.is_cr || false)
                setIsOnHold(mappedContract.is_on_hold || false)
                setIsAnticipated(mappedContract.is_anticipated || false)

                // 2. Fetch Child Data (Agenda & Vendors)
                await fetchAgenda()
                await fetchVendors()

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
            }

            // Resolve IDs from Names or IDs in editForm
            const ptOption = ptOptions.find(o => o.label === editForm.pt_name) || ptOptions.find(o => o.value === editForm.pt_name)
            if (ptOption) updates.pt_id = parseInt(ptOption.value)

            const typeOption = typeOptions.find(o => o.label === editForm.contract_type_name) || typeOptions.find(o => o.value === editForm.contract_type_name)
            if (typeOption) updates.contract_type_id = parseInt(typeOption.value)

            // Appointed Vendor sync
            if (appointedVendorName !== contract.appointed_vendor) {
                updates.appointed_vendor = appointedVendorName
            }

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
            // Optimistic update
            setAgendaList(prev => prev.filter(s => s.id !== stepId))
            const { error } = await supabase.from('contract_bid_agenda').delete().eq('id', stepId)
            if (error) {
                toast.error("Failed to delete step")
                fetchAgenda() // Revert
            } else {
                toast.success("Step deleted")
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

    // 7. Save All (Agenda + Vendors)
    const handleSaveAll = async () => {
        setIsSavingAgenda(true)
        try {
            // A. Save Agenda Items
            for (const item of agendaList) {
                const payload = {
                    contract_id: id,
                    step_name: item.step_name,
                    status: item.status,
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
                    remarks: item.remarks || null,
                }

                if (item.id.startsWith('temp-')) {
                    const { data, error } = await supabase.from('contract_bid_agenda').insert(payload).select().single()
                    if (!error && data) {
                        // Update local ID to prevent re-insert
                        item.id = data.id
                    }
                } else {
                    await supabase.from('contract_bid_agenda').update(payload).eq('id', item.id)
                }
            }

            // B. Save Vendors
            // Filter vendors that are linked to finding steps
            for (const v of vendorList) {
                const payload = {
                    contract_id: id,
                    vendor_name: v.vendor_name,
                    agenda_step_id: v.agenda_step_id || null, // Important linkage
                    kyc_result: v.kyc_result,
                    kyc_note: v.kyc_note,
                    tech_eval_note: v.tech_eval_note,
                    price_note: v.price_note,
                    revised_price_note: v.revised_price_note
                }

                if (v.id.startsWith('temp-')) {
                    const { data, error } = await supabase.from('contract_vendors').insert(payload).select().single()
                    if (!error && data) {
                        // We need to update ID in step_dates if any dates were added for this temp vendor... complex.
                        // But simplify: assume user adds vendor, saves, THEN adds dates. 
                        // Or handling deep nested save:
                        const oldId = v.id
                        v.id = data.id
                        // If we had pending step_dates for this temp vendor, we must update their vendor_id now?
                        // Ideally we save vendor first.
                    }
                } else {
                    await supabase.from('contract_vendors').update(payload).eq('id', v.id)
                }

                // C. Save Vendor Step Dates
                if (v.step_dates) {
                    for (const sd of v.step_dates) {
                        const sdPayload = {
                            vendor_id: v.id, // Now real ID
                            agenda_step_id: sd.agenda_step_id,
                            start_date: sd.start_date || null,
                            end_date: sd.end_date || null,
                            remarks: sd.remarks
                        }

                        if (sd.id.startsWith('temp-')) {
                            await supabase.from('vendor_step_dates').insert(sdPayload)
                        } else {
                            await supabase.from('vendor_step_dates').update(sdPayload).eq('id', sd.id)
                        }
                    }
                }
            }

            // D. Update Appointed Vendor on Contract if changed
            if (appointedVendorName !== contract?.appointed_vendor) {
                await supabase.from('contract_versions').update({ appointed_vendor: appointedVendorName }).eq('id', id)
            }

            toast.success("All changes saved")
            setIsEditingAgenda(false)
            // Full refresh to ensure IDs and state are clean
            fetchAgenda()
            fetchVendors()

        } catch (error) {
            console.error("Save failed:", error)
            toast.error("Failed to save changes")
        } finally {
            setIsSavingAgenda(false)
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

                    {/* BID AGENDA SECTION (Props Aligned) */}
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
                        vendorStepDates={vendorList.flatMap(v => v.step_dates || [])}
                        vendors={vendorList}
                    />

                    {/* MODALS */}
                    <FinalizeContractModal
                        open={showFinalizeModal}
                        onOpenChange={setShowFinalizeModal}
                        mode={finalizeMode}
                        contractId={id}
                        contractNumber={finalizeContractNumber}
                        effectiveDate={finalizeEffectiveDate}
                        expiryDate={finalizeExpiryDate}
                        contractSummary={finalizeContractSummary}
                        referenceNumber={finalizeReferenceNumber}
                        onSuccess={() => {
                            setShowFinalizeModal(false)
                            router.refresh()
                        }}
                    />

                    <ExtendContractModal
                        open={showExtendModal}
                        onOpenChange={setShowExtendModal}
                        contractId={id}
                        currentExpiryDate={contract?.expiry_date || ""}
                        onSuccess={() => {
                            setShowExtendModal(false)
                        }}
                    />
                </div>
            )}
        </div>
    )
}
