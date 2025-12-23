"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { isAfter, parseISO } from "date-fns"
import { toast } from "sonner"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { isAdmin } from "@/lib/adminUtils"
import { Button } from "@/components/ui/button"
import { getContractDisplayStatus } from "@/lib/contractUtils"
import { ContractHeader } from "@/components/contract/ContractHeader"
import { BidAgendaSection } from "@/components/contract/BidAgendaSection"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"
import { GanttChart } from "@/components/contract/GanttChart"
import { ExtendContractModal } from "@/components/contract/ExtendContractModal"
import type { AgendaItem, ContractVendor } from "@/components/contract/BidAgendaSection"
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

    // Options
    const [categoryOptions] = useState<Option[]>([
        { label: "Rent", value: "rent" },
        { label: "Exploration", value: "exploration" },
        { label: "General Services", value: "general_services" },
        { label: "Consulting", value: "consulting" },
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
    const derivedAppointedVendor = agendaList.find(item => item.step_name === "Appointed Vendor")?.remarks || contract?.appointed_vendor

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

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return
            const { data: contractData, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    title, 
                    contract_number, 
                    category, 
                    division,
                    department, 
                    pt_id, 
                    contract_type_id, 
                    effective_date, 
                    expiry_date, 
                    current_step, 
                    pt:pt_id(id, name), 
                    contract_types:contract_type_id(id, name), 
                    profiles:created_by(full_name), 
                    status,
                    is_cr,
                    is_on_hold,
                    status,
                    is_cr,
                    is_on_hold,
                    is_anticipated,
                    is_anticipated,
                    appointed_vendor,
                    created_by
                `)
                .eq('id', id)
                .single()

            if (error) {
                console.error('Error fetching contract:', error)
                setLoading(false)
                return
            }

            if (contractData) {


                // Extract PT info - handle both array and object formats
                const pt = contractData.pt as any
                const ptName = Array.isArray(pt) ? (pt[0]?.name || "") : (pt?.name || "")
                const ptId = Array.isArray(pt) ? (pt[0]?.id || 0) : (pt?.id || 0)

                // Extract Contract Type info - handle both array and object formats
                const types = contractData.contract_types as any
                const typeName = Array.isArray(types) ? (types[0]?.name || "") : (types?.name || "")
                const typeId = contractData.contract_type_id || 0

                setContract(contractData as any)
                setFinalizeContractNumber(contractData.contract_number || "")
                setFinalizeEffectiveDate(contractData.effective_date || "")
                setFinalizeExpiryDate(contractData.expiry_date || "")
                setEditForm({
                    title: contractData.title,
                    category: contractData.category || "",
                    division: contractData.division || "",
                    department: contractData.department || "",
                    pt_id: ptId,
                    pt_name: ptName,
                    contract_type_id: typeId,
                    contract_type_name: typeName,
                    effective_date: contractData.effective_date || "",
                    expiry_date: contractData.expiry_date || "",
                    created_by: contractData.created_by || ""
                })

                if (contractData) {
                    setIsCR(contractData.is_cr || false)
                    setIsOnHold(contractData.is_on_hold || false)
                    setIsAnticipated(contractData.is_anticipated || false)
                }
            }

            await fetchAgenda()
            await fetchVendors()

            // Fetch PT options
            const { data: ptData } = await supabase.from('pt').select('id, name')
            if (ptData) setPtOptions(ptData.map(p => ({ label: p.name, value: p.name })))

            // Fetch Type options
            const { data: typeData } = await supabase.from('contract_types').select('id, name')
            if (typeData) setTypeOptions(typeData.map(t => ({ label: t.name, value: t.name })))

            // Fetch User options
            const { data: profileData } = await supabase.from('profiles').select('id, full_name').order('full_name')
            if (profileData) setUserOptions(profileData.map(p => ({ label: p.full_name || "Unknown", value: p.id })))

            setLoading(false)
        }
        fetchData()
        // Check for active amendments
        const checkAmendment = async () => {
            const { data } = await supabase.from('contracts')
                .select('id')
                .eq('parent_contract_id', id)
                .eq('status', 'On Progress')
                .maybeSingle()
            if (data) setHasAmendmentInProgress(true)
        }
        checkAmendment()
    }, [id])

    // --- HEADER ACTIONS ---
    const handleRevertContract = async () => {
        if (!confirm("Are you sure you want to REVERT this contract to 'On Progress'?\n\n- It will be editable again.\n- Status will change from Active/Completed to On Progress.")) return

        const { error } = await supabase.from('contracts').update({
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

        const finalPtId = ptOptions.find(p => p.value === editForm.pt_name)
        const finalTypeId = typeOptions.find(t => t.value === editForm.contract_type_name)

        const { error } = await supabase.from('contracts').update({
            title: editForm.title,
            category: editForm.category,
            division: editForm.division,
            department: editForm.department,
            pt_id: finalPtId ? parseInt(finalPtId.label) : contract.pt_id,
            contract_type_id: finalTypeId ? parseInt(finalTypeId.label) : contract.contract_type_id,
            effective_date: (isActive && editForm.effective_date) ? editForm.effective_date : contract.effective_date,
            expiry_date: (isActive && editForm.expiry_date) ? editForm.expiry_date : contract.expiry_date,
            is_cr: isCR,
            is_on_hold: isOnHold,
            is_anticipated: isAnticipated,
            created_by: editForm.created_by || contract.created_by // Only update if set
        }).eq('id', id)

        if (error) toast.error("Failed to update status", { description: error.message })
        else {
            setContract(prev => prev ? {
                ...prev,
                title: editForm.title,
                category: editForm.category,
                division: editForm.division,
                department: editForm.department,
                expiry_date: (isActive && editForm.expiry_date) ? editForm.expiry_date : prev.expiry_date,
                created_by: editForm.created_by || prev.created_by,
                // Optimistically update profile name if possible, or wait for refresh.
                // For now, next refresh will catch it.
                profiles: userOptions.find(u => u.value === editForm.created_by) ? { full_name: userOptions.find(u => u.value === editForm.created_by)!.label } : prev.profiles
            } : null)
            setIsEditingHeader(false)
        }
    }

    // --- AGENDA ACTIONS ---
    const handleAddStep = async (stepName: string) => {
        const { data, error } = await supabase.from('contract_bid_agenda').insert({ contract_id: id, step_name: stepName, status: 'Pending' }).select().single()
        if (error) toast.error("Failed to add step", { description: error.message })
        else if (data) {
            setAgendaList(prev => [...prev, data])
        }
    }

    const handleDeleteStep = async (stepId: string) => {
        if (!confirm("Are you sure you want to delete this step?")) return
        const { error } = await supabase.from('contract_bid_agenda').delete().eq('id', stepId)
        if (error) {
            toast.error("Delete failed", { description: error.message })
        } else {
            setAgendaList(prev => prev.filter(i => i.id !== stepId))
        }
    }

    const handleUpdateAgendaItemLocal = (itemId: string, field: keyof AgendaItem, value: string) => {
        setAgendaList(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item))
    }

    const handleUpdateVendorData = (vendorId: string, field: keyof ContractVendor, value: any) => {
        setVendorList(prev => prev.map(v => {
            if (v.id === vendorId) {
                return { ...v, [field]: value }
            }
            return v
        }))
    }

    const handleAddVendor = async (stepId: string) => {
        if (!newVendorName.trim()) return
        const { data, error } = await supabase
            .from('contract_vendors')
            .insert({
                contract_id: id,
                vendor_name: newVendorName,
                agenda_step_id: stepId  // Link vendor to specific agenda step
            })
            .select()
            .single()
        if (error) toast.error("Failed to add vendor", { description: error.message })
        else if (data) {
            setVendorList(prev => [...prev, data])
            setNewVendorName("")
        }
    }

    const handleDeleteVendor = async (vendorId: string) => {
        if (!confirm("Remove vendor candidate?")) return
        const { error } = await supabase.from('contract_vendors').delete().eq('id', vendorId)
        if (!error) {
            setVendorList(prev => prev.filter(v => v.id !== vendorId))
        }
    }

    // --- BULK SAVE & FINALIZE ---
    const handleFinalizeContract = async () => {
        if (!contract) return

        if (finalizeEffectiveDate && finalizeExpiryDate) {
            if (isAfter(parseISO(finalizeEffectiveDate), parseISO(finalizeExpiryDate)) || finalizeEffectiveDate === finalizeExpiryDate) {
                toast.error("Invalid Date Range", { description: "Expiry Date must be AFTER the Effective Date." })
                return
            }
        }

        // Extract Appointed Vendor from Agenda to ensure it's saved
        const appointedVendorStep = agendaList.find(item => item.step_name === "Appointed Vendor")
        const finalAppointedVendor = appointedVendorStep?.remarks || contract.appointed_vendor

        // Determine status based on current state
        let targetStatus = 'Active' // Default for Draft completion

        // If already Active (or Expired but being finished), move to Completed
        if (contract.status === 'Active' || contract.status === 'Expired') {
            targetStatus = 'Completed'
        }

        const { error } = await supabase.from('contracts').update({
            contract_number: finalizeContractNumber,
            effective_date: finalizeEffectiveDate || null,
            expiry_date: finalizeExpiryDate || null,
            status: targetStatus,
            contract_summary: finalizeContractSummary || null,
            reference_contract_number: finalizeReferenceNumber || null,
            appointed_vendor: finalAppointedVendor // Ensure this is saved
        }).eq('id', id)

        if (error) {
            toast.error("Error completing contract", { description: error.message })
        } else {
            setContract(prev => prev ? {
                ...prev,
                contract_number: finalizeContractNumber,
                effective_date: finalizeEffectiveDate || null,
                expiry_date: finalizeExpiryDate || null,
                status: targetStatus
            } : null)
            setEditForm(prev => ({
                ...prev,
                effective_date: finalizeEffectiveDate,
                expiry_date: finalizeExpiryDate
            }))
            setShowFinalizeModal(false)
            toast.success(targetStatus === 'Completed' ? "Contract Archived as Inactive/Completed." : "Contract activated successfully!")
            router.push(targetStatus === 'Completed' ? "/contractmanagement/finished" : "/contractmanagement?tab=active")
        }
    }

    const handleExtendContract = async (newExpiryDate: string) => {
        if (!contract) return
        if (!newExpiryDate) return

        const { error } = await supabase.from('contracts').update({
            expiry_date: newExpiryDate
        }).eq('id', id)

        if (error) {
            toast.error("Error extending contract", { description: error.message })
        } else {
            setContract(prev => prev ? { ...prev, expiry_date: newExpiryDate } : null)
            setEditForm(prev => ({ ...prev, expiry_date: newExpiryDate }))
            toast.success("Contract extended successfully!")
        }
    }

    const handleSaveAll = async () => {
        setIsSavingAgenda(true)
        try {
            // Hoist variable for broader scope
            const appointedVendorName = contract?.appointed_vendor

            // Update contract header if editing
            if (contract && isEditingHeader) {
                const ptRecord = await supabase.from('pt').select('id').eq('name', editForm.pt_name).single()
                const ptId = ptRecord.data?.id || contract.pt_id

                const typeRecord = await supabase.from('contract_types').select('id').eq('name', editForm.contract_type_name).single()
                const typeId = typeRecord.data?.id || contract.contract_type_id

                const { error: contractError } = await supabase.from('contracts')
                    .update({
                        title: editForm.title,
                        category: editForm.category,
                        division: editForm.division,
                        department: editForm.department,
                        pt_id: ptId,
                        contract_type_id: typeId,
                        effective_date: editForm.effective_date || null,
                        expiry_date: editForm.expiry_date || null,
                        appointed_vendor: appointedVendorName
                    })
                    .eq('id', id)

                if (contractError) throw new Error("Failed to save contract header: " + contractError.message)
            } else if (contract) {
                // Even if not editing header, we MUST save the Appointed Vendor if it changed
                // because that selection happens in the Agenda section
                const { error: vendorError } = await supabase.from('contracts')
                    .update({
                        appointed_vendor: appointedVendorName
                    })
                    .eq('id', id)

                if (vendorError) throw new Error("Failed to save appointed vendor: " + vendorError.message)
            }

            // Update all agenda items
            for (const item of agendaList) {
                const { error } = await supabase.from('contract_bid_agenda')
                    .update({
                        start_date: item.start_date,
                        end_date: item.end_date,
                        remarks: item.remarks,
                        status: item.status
                    })
                    .eq('id', item.id)
                if (error) throw error
            }

            // Update all vendors
            for (const vendor of vendorList) {

                const { error } = await supabase.from('contract_vendors')
                    .update({
                        kyc_result: vendor.kyc_result,
                        kyc_note: vendor.kyc_note,
                        tech_eval_score: vendor.tech_eval_score,
                        tech_eval_note: vendor.tech_eval_note,
                        tech_eval_remarks: vendor.tech_eval_remarks,
                        price_note: vendor.price_note,
                        revised_price_note: vendor.revised_price_note,
                        is_appointed: appointedVendorName === vendor.vendor_name // Save the boolean flag
                    })
                    .eq('id', vendor.id)
                if (error) throw error

                // Save step-specific dates to vendor_step_dates table
                if (vendor.step_dates && vendor.step_dates.length > 0) {
                    for (const stepDate of vendor.step_dates) {
                        const { error: stepDateError } = await supabase
                            .from('vendor_step_dates')
                            .upsert({
                                vendor_id: vendor.id,
                                agenda_step_id: stepDate.agenda_step_id,
                                start_date: stepDate.start_date || null,
                                end_date: stepDate.end_date || null,
                                remarks: stepDate.remarks || null,
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'vendor_id,agenda_step_id'
                            })
                            .select()

                        if (stepDateError) throw stepDateError
                    }
                } else {
                    // No step_dates for vendor
                }
            }

            // Refresh all data after save
            const { data: contractData } = await supabase.from('contracts')
                .select('*, pt(id, name), contract_types(id, name), profiles(full_name)')
                .eq('id', id)
                .single()

            if (contractData) {
                setContract(contractData)
                setEditForm({
                    title: contractData.title,
                    category: contractData.category || "",
                    division: contractData.division || "",
                    department: contractData.department || "",
                    pt_id: contractData.pt?.id || 0,
                    pt_name: contractData.pt?.name || "",
                    contract_type_id: contractData.contract_types?.id || 0,
                    contract_type_name: contractData.contract_types?.name || "",
                    effective_date: contractData.effective_date || "",
                    expiry_date: contractData.expiry_date || "",
                    created_by: contractData.created_by || ""
                })
            }

            // Refresh agenda and vendors
            try {
                await fetchAgenda()
                await fetchVendors()
            } catch (refreshError) {
                console.error('Error refreshing data:', refreshError)
                // Don't throw - save was successful even if refresh fails
            }

            setIsEditingAgenda(false)
            setIsEditingHeader(false)
            toast.success("All changes saved successfully!")
        } catch (err: any) {
            toast.error("Failed to save", { description: err.message })
            console.error(err)
        } finally {
            setIsSavingAgenda(false)
        }
    }

    if (loading && !contract) return <div className="p-8">Loading...</div>

    return (
        <div className="flex-1 space-y-6 p-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild className="pl-0">
                    <Link href={
                        contract?.status === 'Completed' ? "/contractmanagement/finished" :
                            contract?.status === 'Active' ? "/contractmanagement?tab=active" :
                                "/contractmanagement?tab=ongoing"
                    }>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
            </div>

            {/* CONTRACT HEADER */}
            <ContractHeader
                contract={contract ? {
                    ...contract,
                    appointed_vendor: derivedAppointedVendor,
                    createdBy: (contract.profiles as any)?.full_name || "Unknown"
                } : null}
                displayStatus={displayStatus}
                isActive={isActive}
                isReadyToFinalize={isReadyToFinalize}
                isEditingHeader={isEditingHeader}
                editForm={editForm}
                categoryOptions={categoryOptions}
                ptOptions={ptOptions}
                typeOptions={typeOptions}
                hasAmendmentInProgress={hasAmendmentInProgress}
                onEditToggle={() => setIsEditingHeader(!isEditingHeader)}
                onFormChange={(updates) => setEditForm(prev => ({ ...prev, ...updates }))}
                onSave={handleSaveHeader}
                onFinish={() => {
                    setFinalizeMode('finish')
                    setFinalizeContractSummary("")
                    setShowFinalizeModal(true)
                }}
                onAmend={() => {
                    setFinalizeMode('amend')
                    setFinalizeContractSummary("")
                    setShowFinalizeModal(true)
                }}
                onExtend={() => setShowExtendModal(true)}
                onRevert={isAdmin(userPosition) ? handleRevertContract : undefined}
                isCR={isCR}
                isOnHold={isOnHold}
                isAnticipated={isAnticipated}
                onStatusChange={(field, value) => {
                    if (field === 'is_cr') setIsCR(value)
                    if (field === 'is_on_hold') setIsOnHold(value)
                    if (field === 'is_anticipated') setIsAnticipated(value)
                }}
                userOptions={userOptions}
                userPosition={userPosition}
            />

            {/* GANTT CHART - Project Timeline */}
            {agendaList.length > 0 && (
                <div className="mb-6">
                    <GanttChart agendaItems={agendaList} vendorItems={vendorList} />
                </div>
            )}

            {/* BID AGENDA */}
            <BidAgendaSection
                agendaList={agendaList}
                vendorList={vendorList}
                isEditingAgenda={isEditingAgenda}
                isSavingAgenda={isSavingAgenda}
                newVendorName={newVendorName}
                onEditToggle={() => setIsEditingAgenda(true)}
                onSaveAll={handleSaveAll}
                onAddStep={handleAddStep}
                onDeleteStep={handleDeleteStep}
                onUpdateAgendaItem={handleUpdateAgendaItemLocal}
                onUpdateVendorData={handleUpdateVendorData}
                onAddVendor={handleAddVendor}
                onDeleteVendor={handleDeleteVendor}
                onNewVendorNameChange={setNewVendorName}
                appointedVendorName={contract?.appointed_vendor}
                onAppointedVendorChange={(name) => {
                    setContract(prev => prev ? { ...prev, appointed_vendor: name } : null)
                }}
            />

            {/* FINALIZE MODAL */}
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
                onFinalize={handleFinalizeContract}
                isAmendment={finalizeMode === 'amend'}
                referenceContractNumber={finalizeReferenceNumber}
                onReferenceNumberChange={setFinalizeReferenceNumber}
            />

            {/* EXTEND CONTRACT MODAL */}
            {contract && (
                <ExtendContractModal
                    open={showExtendModal}
                    onOpenChange={setShowExtendModal}
                    currentExpiryDate={contract.expiry_date || ""}
                    onExtend={handleExtendContract}
                />
            )}
        </div>
    )
}
