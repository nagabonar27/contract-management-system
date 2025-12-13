"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, FilePenLine, Trash2, Calendar as CalendarIcon, Plus, Save, ExternalLink, Pencil, Check, FileCheck } from "lucide-react"
import { format, isAfter, parseISO, compareAsc } from "date-fns"

import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox, Option } from "@/components/ui/shared/combobox"
import { AddStepModal } from "@/components/ui/shared/add-step-modal"
import { ButtonGroup } from "@/components/ui/button-group"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

// Types
type ContractData = {
    id: string
    title: string
    contract_number: string | null
    category: string | null
    contract_type_id: number | null
    pt_id: number | null
    effective_date: string | null
    expiry_date: string | null
    current_step: string
    pt: { name: string } | null
    contract_types: { name: string } | null
    profiles: { full_name: string } | null
    status: string
}

type AgendaItem = {
    id: string
    contract_id: string
    step_name: string
    start_date: string | null
    end_date: string | null
    remarks: string | null
    status: string
    created_at: string
}

type ContractVendor = {
    id: string
    contract_id: string
    vendor_name: string
    kyc_result: string | null
    kyc_note: string | null
    tech_eval_note: string | null
    price_note: string | null
    revised_price_note: string | null
}

export default function ContractDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [contract, setContract] = useState<ContractData | null>(null)
    const [agendaList, setAgendaList] = useState<AgendaItem[]>([])
    const [vendorList, setVendorList] = useState<ContractVendor[]>([])

    // Global Edit State
    const [isEditingAgenda, setIsEditingAgenda] = useState(false)
    const [isSavingAgenda, setIsSavingAgenda] = useState(false)

    // Finalize / Contract Number State
    const [showFinalizeModal, setShowFinalizeModal] = useState(false)
    const [finalizeContractNumber, setFinalizeContractNumber] = useState("")
    const [finalizeEffectiveDate, setFinalizeEffectiveDate] = useState("")
    const [finalizeExpiryDate, setFinalizeExpiryDate] = useState("")

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

    // Edit Header State
    const [isEditingHeader, setIsEditingHeader] = useState(false)
    const [editForm, setEditForm] = useState({
        title: "",
        category: "",
        pt_id: 0,
        pt_name: "",
        contract_type_id: 0,
        contract_type_name: "",
        effective_date: "",
        expiry_date: ""
    })

    // --- UTILS ---
    const formatNumber = (val: string) => {
        if (!val) return ""
        const number = val.replace(/\D/g, "")
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    const parseNumber = (val: string) => {
        return val.replace(/\./g, "")
    }

    // --- COMPUTED STATUS (CLIENT SIDE) ---
    const getDisplayStatus = (currentContract: ContractData | null, agenda: AgendaItem[]) => {
        if (!currentContract) return "Loading..."
        const now = new Date()

        // Check Expiry First
        if (currentContract.expiry_date && isAfter(now, parseISO(currentContract.expiry_date))) {
            return "Expired"
        }

        // Active / Completed
        if (currentContract.status === 'Active' || currentContract.status === 'Completed') return currentContract.status;

        // Ready to Finalize?
        const internalSign = agenda.find(s => s.step_name === "Internal Contract Signature Process")
        const vendorSign = agenda.find(s => s.step_name === "Vendor Contract Signature Process")

        // Check if both signature steps are essentially marked "done" (have end dates)
        const internalDone = internalSign?.start_date && internalSign?.end_date
        const vendorDone = vendorSign?.start_date && vendorSign?.end_date

        if (internalDone && vendorDone) {
            return "Ready to Finalize"
        }
        return "On Progress"
    }

    // Status Logic
    const displayStatus = getDisplayStatus(contract, agendaList)
    const isActive = displayStatus === 'Active' || displayStatus === 'Completed' || displayStatus === 'Expired'
    const isReadyToFinalize = displayStatus === 'Ready to Finalize'

    // --- DATA LOADING ---
    const fetchAgenda = async () => {
        const { data } = await supabase.from('contract_bid_agenda').select('*').eq('contract_id', id)
        if (data) {
            // Sort by Created At implicitly or just ensure consistent order
            const sorted = data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            setAgendaList(sorted)
        }
    }

    const fetchVendors = async () => {
        const { data } = await supabase.from('contract_vendors').select('*').eq('contract_id', id).order('created_at', { ascending: true })
        if (data) setVendorList(data)
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return
            const { data: contractData } = await supabase
                .from('contracts')
                .select(`id, title, contract_number, category, pt_id, contract_type_id, effective_date, expiry_date, current_step, pt:pt_id(id, name), contract_types(id, name), profiles:created_by(full_name), status`)
                .eq('id', id).single()

            if (contractData) {
                // @ts-ignore
                const ptName = contractData.pt?.name || ""
                // @ts-ignore
                const ptId = contractData.pt?.id || 0
                // @ts-ignore
                const typeName = contractData.contract_types?.name || ""
                const typeId = contractData.contract_type_id || 0

                setContract(contractData)
                setFinalizeContractNumber(contractData.contract_number || "")
                setFinalizeEffectiveDate(contractData.effective_date || "")
                setFinalizeExpiryDate(contractData.expiry_date || "")
                setEditForm({
                    title: contractData.title,
                    category: contractData.category || "",
                    pt_id: ptId,
                    pt_name: ptName,
                    contract_type_id: typeId,
                    contract_type_name: typeName,
                    effective_date: contractData.effective_date || "",
                    expiry_date: contractData.expiry_date || ""
                })
            }

            await fetchAgenda()
            await fetchVendors()

            const { data: pts } = await supabase.from('pt').select('id, name')
            if (pts) setPtOptions(pts.map(p => ({ label: p.name, value: p.name, id: p.id })))

            const { data: types } = await supabase.from('contract_types').select('id, name')
            if (types) setTypeOptions(types.map(t => ({ label: t.name, value: t.name, id: t.id })))

            setLoading(false)
        }
        fetchData()
    }, [id])


    // --- HEADER ACTIONS ---
    const handleSaveHeader = async () => {
        if (!contract) return

        let finalPtId = editForm.pt_id
        const selectedPtOption = ptOptions.find(p => p.label === editForm.pt_name)
        if (selectedPtOption && selectedPtOption.id) finalPtId = selectedPtOption.id

        let finalTypeId = editForm.contract_type_id
        const selectedTypeOption = typeOptions.find(t => t.label === editForm.contract_type_name)
        if (selectedTypeOption && selectedTypeOption.id) finalTypeId = selectedTypeOption.id

        // Validation for date updates if active
        if (isActive && editForm.effective_date && editForm.expiry_date) {
            if (isAfter(parseISO(editForm.effective_date), parseISO(editForm.expiry_date)) || editForm.effective_date === editForm.expiry_date) {
                alert("Expiry Date must be AFTER the Effective Date.")
                return
            }
        }

        const { error } = await supabase.from('contracts').update({
            title: editForm.title,
            category: editForm.category,
            pt_id: finalPtId,
            contract_type_id: finalTypeId,
            effective_date: (isActive && editForm.effective_date) ? editForm.effective_date : contract.effective_date,
            expiry_date: (isActive && editForm.expiry_date) ? editForm.expiry_date : contract.expiry_date
        }).eq('id', id)

        if (error) alert(error.message)
        else {
            setContract(prev => prev ? {
                ...prev,
                title: editForm.title,
                category: editForm.category,
                pt_id: finalPtId,
                pt: { name: editForm.pt_name },
                contract_type_id: finalTypeId,
                contract_types: { name: editForm.contract_type_name },
                effective_date: (isActive && editForm.effective_date) ? editForm.effective_date : prev.effective_date,
                expiry_date: (isActive && editForm.expiry_date) ? editForm.expiry_date : prev.expiry_date
            } : null)
            setIsEditingHeader(false)
        }
    }

    // --- AGENDA ACTIONS ---

    const handleAddStep = async (stepName: string) => {
        const { data, error } = await supabase.from('contract_bid_agenda').insert({ contract_id: id, step_name: stepName, status: 'Pending' }).select().single()
        if (error) alert("Failed to add step: " + error.message)
        else if (data) {
            setAgendaList(prev => [...prev, data])
        }
    }

    const handleDeleteStep = async (stepId: string) => {
        if (!confirm("Are you sure you want to delete this step?")) return
        const { error } = await supabase.from('contract_bid_agenda').delete().eq('id', stepId)
        if (error) {
            alert("Delete failed: " + error.message)
        } else {
            setAgendaList(prev => prev.filter(i => i.id !== stepId))
        }
    }

    const handleUpdateAgendaItemLocal = (itemId: string, field: keyof AgendaItem, value: string) => {
        setAgendaList(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item))
    }

    const handleUpdateVendorData = (vendorId: string, field: keyof ContractVendor, value: string) => {
        setVendorList(prev => prev.map(v => v.id === vendorId ? { ...v, [field]: value } : v))
    }

    const handleAddVendor = async () => {
        if (!newVendorName.trim()) return
        const { data, error } = await supabase.from('contract_vendors').insert({ contract_id: id, vendor_name: newVendorName }).select().single()
        if (error) alert(error.message)
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

        // Validation: Expiry must be after Effective
        if (finalizeEffectiveDate && finalizeExpiryDate) {
            if (isAfter(parseISO(finalizeEffectiveDate), parseISO(finalizeExpiryDate)) || finalizeEffectiveDate === finalizeExpiryDate) {
                alert("Expiry Date must be AFTER the Effective Date.")
                return
            }
        }

        const { error } = await supabase.from('contracts').update({
            contract_number: finalizeContractNumber,
            effective_date: finalizeEffectiveDate || null,
            expiry_date: finalizeExpiryDate || null,
            status: 'Active'
        }).eq('id', id)

        if (error) {
            alert("Error finalizing: " + error.message)
        } else {
            setContract(prev => prev ? {
                ...prev,
                contract_number: finalizeContractNumber,
                effective_date: finalizeEffectiveDate || null,
                expiry_date: finalizeExpiryDate || null,
                status: 'Active'
            } : null)
            setEditForm(prev => ({
                ...prev,
                effective_date: finalizeEffectiveDate,
                expiry_date: finalizeExpiryDate
            }))
            setShowFinalizeModal(false)
            router.refresh()
        }
    }

    const handleSaveAll = async () => {
        setIsSavingAgenda(true)

        try {
            // 1. Update Agenda Items
            const agendaPromises = agendaList.map(item => {
                let newStatus = item.status
                if (item.start_date && !item.end_date) newStatus = "In Progress"
                if (item.start_date && item.end_date) newStatus = "Completed"
                if (!item.start_date && !item.end_date) newStatus = "Pending"

                return supabase.from('contract_bid_agenda').update({
                    start_date: item.start_date || null,
                    end_date: item.end_date || null,
                    remarks: item.remarks,
                    status: newStatus
                }).eq('id', item.id)
            })

            // 2. Update Vendor Items (Evaluations)
            const vendorPromises = vendorList.map(v => {
                const updatePayload: any = {
                    kyc_result: v.kyc_result,
                    kyc_note: v.kyc_note,
                    tech_eval_note: v.tech_eval_note,
                    price_note: parseNumber(v.price_note || ""),
                }
                // Only try to update revised_price_note if it exists in local state
                if (v.revised_price_note !== undefined && v.revised_price_note !== null) {
                    updatePayload.revised_price_note = parseNumber(v.revised_price_note || "")
                }

                return supabase.from('contract_vendors').update(updatePayload).eq('id', v.id)
            })

            const results = await Promise.all([...agendaPromises, ...vendorPromises])

            // Check for errors
            const errors = results.filter(r => r.error).map(r => r.error?.message)
            if (errors.length > 0) {
                console.error("Save errors:", errors)
                alert("Some changes could not be saved:\n" + errors.join("\n"))
            }

            // 3. Re-fetch for clean state & Current Step Calculation
            const { data: newData } = await supabase.from('contract_bid_agenda').select('*').eq('contract_id', id)
            let sortedData: AgendaItem[] = []
            if (newData) {
                sortedData = newData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                setAgendaList(sortedData)
            }

            // 4. Update Current Step Logic (ROBUST)
            let currentStepValue = ""
            if (sortedData.length > 0) {
                const started = sortedData.filter(s => s.start_date)

                if (started.length > 0) {
                    const lastStarted = started[started.length - 1]
                    if (lastStarted.end_date) {
                        const idx = sortedData.findIndex(s => s.id === lastStarted.id)
                        if (idx >= 0 && idx < sortedData.length - 1) {
                            currentStepValue = sortedData[idx + 1].step_name
                        } else {
                            currentStepValue = "Completed"
                        }
                    } else {
                        currentStepValue = lastStarted.step_name
                    }
                } else {
                    currentStepValue = sortedData[0].step_name
                }
            }

            await supabase.from('contracts').update({ current_step: currentStepValue }).eq('id', id)
            setContract(prev => prev ? { ...prev, current_step: currentStepValue } : null)

            // 5. Check Finalize Trigger
            const internalSignItem = sortedData.find(s => s.step_name === "Internal Contract Signature Process")
            const vendorSignItem = sortedData.find(s => s.step_name === "Vendor Contract Signature Process")

            const internalDone = internalSignItem?.start_date && internalSignItem?.end_date
            const vendorDone = vendorSignItem?.start_date && vendorSignItem?.end_date

            if (internalDone && vendorDone && contract?.status !== 'Active') {
                setShowFinalizeModal(true)
            }

            setIsEditingAgenda(false)
            router.refresh()

        } catch (err: any) {
            console.error("Critical Save Error:", err)
            alert("Failed to save agenda: " + err.message)
        } finally {
            setIsSavingAgenda(false)
        }
    }


    if (loading && !contract) return <div className="p-8">Loading...</div>

    return (
        <div className="flex-1 space-y-6 p-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild className="pl-0"><Link href="/dashboard/ongoing"><ChevronLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
            </div>

            {/* HEADER */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-3">
                            {contract?.title}
                            <Badge variant={isActive ? 'default' : (displayStatus as string) === 'Expired' ? 'destructive' : 'secondary'}>
                                {displayStatus}
                            </Badge>
                        </CardTitle>
                        <CardDescription>ID: {contract?.id}</CardDescription>
                        {contract?.contract_number && <span className="mr-4 mt-1 text-sm font-medium text-blue-600">Contract #: {contract.contract_number}</span>}
                        {contract?.expiry_date && <span className="mt-1 text-sm text-muted-foreground">Expires: {contract.expiry_date}</span>}
                    </div>
                    <div className="flex gap-2">
                        {isReadyToFinalize && !isActive && (
                            <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => setShowFinalizeModal(true)}>
                                <FileCheck className="mr-2 h-4 w-4" /> Finalize Contract
                            </Button>
                        )}
                        <Button variant={isEditingHeader ? "secondary" : "outline"} size="sm" onClick={() => setIsEditingHeader(!isEditingHeader)}>
                            {isEditingHeader ? "Cancel" : <><FilePenLine className="mr-2 h-4 w-4" /> Edit Details</>}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditingHeader ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2"><Label>Contract Name</Label><Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></div>
                            <div className="grid gap-2"><Label>Contract Type</Label><Combobox options={typeOptions} value={editForm.contract_type_name} onSelect={val => setEditForm({ ...editForm, contract_type_name: val })} /></div>
                            <div className="grid gap-2"><Label>Category</Label><Combobox options={categoryOptions} value={editForm.category} onSelect={val => setEditForm({ ...editForm, category: val })} allowCreate onCreate={val => setEditForm({ ...editForm, category: val })} /></div>
                            <div className="grid gap-2"><Label>PT</Label><Combobox options={ptOptions} value={editForm.pt_name} onSelect={val => setEditForm({ ...editForm, pt_name: val })} /></div>

                            {/* Dates are editable if editing header, but special logic if finalized */}
                            {(isActive) && (
                                <>
                                    <div className="grid gap-2"><Label>Effective Date</Label><Input type="date" value={editForm.effective_date} onChange={e => setEditForm({ ...editForm, effective_date: e.target.value })} /></div>
                                    <div className="grid gap-2"><Label>Expiry Date</Label><Input type="date" value={editForm.expiry_date} onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })} /></div>
                                </>
                            )}
                            <Button className="md:col-span-2" onClick={handleSaveHeader}>Save Changes</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                            <div><span className="block text-muted-foreground">Type</span><span className="font-medium">{contract?.contract_types?.name || '-'}</span></div>
                            <div><span className="block text-muted-foreground">Category</span><span className="font-medium">{contract?.category || '-'}</span></div>
                            <div><span className="block text-muted-foreground">PT</span><span className="font-medium">{contract?.pt?.name || '-'}</span></div>
                            <div><span className="block text-muted-foreground">Current Step</span><span className="font-medium">{contract?.current_step || '-'}</span></div>
                            {isActive && contract?.effective_date && <div><span className="block text-muted-foreground">Effective Date</span><span className="font-medium">{contract.effective_date}</span></div>}
                            {isActive && contract?.expiry_date && <div><span className="block text-muted-foreground">Expiry Date</span><span className="font-medium">{contract.expiry_date}</span></div>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AGENDA */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Bid Agenda</CardTitle>
                        <div className="flex items-center gap-2">
                            {isEditingAgenda && <AddStepModal onSelect={handleAddStep} />}
                            <Button
                                variant={isEditingAgenda ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (isEditingAgenda) handleSaveAll()
                                    else setIsEditingAgenda(true)
                                }}
                                disabled={isSavingAgenda}
                            >
                                {isSavingAgenda ? "Saving..." : isEditingAgenda ? <><Check className="mr-2 h-4 w-4" /> Save Agenda</> : <><Pencil className="mr-2 h-4 w-4" /> Edit Agenda</>}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr className="border-b">
                                    <th className="h-10 px-4 text-left font-medium w-1/3">Step</th>
                                    <th className="h-10 px-4 text-left font-medium">Start</th>
                                    <th className="h-10 px-4 text-left font-medium">End</th>
                                    <th className="h-10 px-4 text-left font-medium">Remarks</th>
                                    {isEditingAgenda && <th className="h-10 px-4 text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {agendaList.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No steps added.</td></tr>}
                                {agendaList.map((item) => {
                                    const isVendorFindings = item.step_name === "Vendor Findings";
                                    const isAppointedVendor = item.step_name === "Appointed Vendor";
                                    const isRevisedPrice = item.step_name.includes("Revised Price");
                                    const isKYC = item.step_name.includes("KYC");
                                    const isTechEval = item.step_name.includes("Technical Evaluation");
                                    const isPrice = item.step_name.includes("Price") && !isRevisedPrice;

                                    const isVendorDependent = (isKYC || isTechEval || isPrice || isRevisedPrice || isAppointedVendor) && !isVendorFindings;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className={cn("border-b transition-colors", isEditingAgenda ? "bg-muted/30" : "hover:bg-muted/50")}>
                                                <td className="p-4 align-top font-medium">
                                                    <div>{item.step_name}</div>
                                                    {item.status === 'Completed' && !isEditingAgenda && <Badge className="mt-1 bg-green-500 text-[10px]">Done</Badge>}
                                                    {item.status === 'In Progress' && !isEditingAgenda && <Badge className="mt-1 bg-blue-500 text-[10px]">Active</Badge>}
                                                </td>
                                                <td className="p-4 align-top">
                                                    {isEditingAgenda ? <Input type="date" value={item.start_date || ""} onChange={e => handleUpdateAgendaItemLocal(item.id, 'start_date', e.target.value)} className="w-[140px] h-8 text-xs" /> : <span className="text-muted-foreground">{item.start_date || "-"}</span>}
                                                </td>
                                                <td className="p-4 align-top">
                                                    {isEditingAgenda ? <Input type="date" value={item.end_date || ""} onChange={e => handleUpdateAgendaItemLocal(item.id, 'end_date', e.target.value)} className="w-[140px] h-8 text-xs" /> : <span className="text-muted-foreground">{item.end_date || "-"}</span>}
                                                </td>
                                                <td className="p-4 align-top">
                                                    {(isAppointedVendor && isEditingAgenda) ? (
                                                        <Select value={item.remarks || ""} onValueChange={val => handleUpdateAgendaItemLocal(item.id, 'remarks', val)}>
                                                            <SelectTrigger className="h-8 w-full text-xs">
                                                                <SelectValue placeholder="Select Appointed Vendor" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {vendorList.filter(v => v.kyc_result === 'Pass').map(v => (
                                                                    <SelectItem key={v.id} value={v.vendor_name}>{v.vendor_name}</SelectItem>
                                                                ))}
                                                                {vendorList.filter(v => v.kyc_result === 'Pass').length === 0 && <span className="p-2 text-xs text-muted-foreground">No passed vendors</span>}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        isEditingAgenda ? <Input value={item.remarks || ""} onChange={e => handleUpdateAgendaItemLocal(item.id, 'remarks', e.target.value)} className="h-8 text-xs" placeholder="Remarks..." /> : <span>{item.remarks || "-"}</span>
                                                    )}
                                                </td>
                                                {isEditingAgenda && (
                                                    <td className="p-4 align-top text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteStep(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>

                                            {/* --- SUB-ROWS FOR VENDOR FINDINGS --- */}
                                            {isVendorFindings && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 pb-4 pt-0 bg-muted/10">
                                                        <div className="p-4 border border-t-0 rounded-b-md space-y-3">
                                                            <h4 className="text-sm font-semibold">Candidates</h4>
                                                            {vendorList.length === 0 && <div className="text-xs text-muted-foreground italic">No candidates added.</div>}
                                                            {vendorList.map(v => (
                                                                <div key={v.id} className="flex justify-between items-center text-sm bg-white p-2 border rounded shadow-sm">
                                                                    <span>{v.vendor_name}</span>
                                                                    {isEditingAgenda && (
                                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => handleDeleteVendor(v.id)}>
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {isEditingAgenda && (
                                                                <div className="flex gap-2">
                                                                    <Input placeholder="Add New Vendor Name" className="h-8 w-[250px] text-xs bg-white" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} />
                                                                    <Button size="sm" className="h-8" onClick={handleAddVendor}>Add Candidate</Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* --- SUB-ROWS FOR EVALUATIONS --- */}
                                            {isVendorDependent && vendorList.length > 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 pb-4 pt-0 bg-muted/10">
                                                        <div className="p-4 border border-t-0 rounded-b-md space-y-3">
                                                            <h4 className="text-sm font-semibold">Vendor Evaluations: {item.step_name}</h4>
                                                            <div className="grid gap-2">
                                                                {vendorList.map(v => {
                                                                    let field: keyof ContractVendor | null = null
                                                                    if (isKYC) field = "kyc_note"
                                                                    if (isTechEval) field = "tech_eval_note"
                                                                    if (isPrice) field = "price_note"
                                                                    if (isRevisedPrice) field = "revised_price_note"

                                                                    if (!field && !isAppointedVendor) return null
                                                                    if (isAppointedVendor) return null;

                                                                    if ((isTechEval || isPrice || isRevisedPrice) && v.kyc_result === 'Fail') return null;

                                                                    const displayValue = v[field!] || "-"

                                                                    // For Revised Price, default to Price Note if Revised is empty
                                                                    const revisedValue = (isRevisedPrice && (v.revised_price_note === null || v.revised_price_note === undefined))
                                                                        ? v.price_note
                                                                        : v[field!]

                                                                    return (
                                                                        <div key={v.id} className="flex items-center gap-2">
                                                                            <div className="w-[200px] text-sm font-medium truncate" title={v.vendor_name}>{v.vendor_name}</div>

                                                                            {/* READ ONLY MODE */}
                                                                            {!isEditingAgenda && (
                                                                                <div className="flex-1 flex items-center justify-between text-sm text-gray-700 bg-white p-1 px-2 border rounded">
                                                                                    <span>
                                                                                        {isKYC ? (v.kyc_result || "Pending") + (displayValue !== "-" ? ` - ${displayValue}` : "") :
                                                                                            (isPrice || isRevisedPrice) ? `IDR ${formatNumber(revisedValue || "0")}` :
                                                                                                displayValue}
                                                                                    </span>
                                                                                    {isRevisedPrice && (
                                                                                        (() => {
                                                                                            const original = parseFloat(v.price_note || "0")
                                                                                            const revised = parseFloat(revisedValue || "0")
                                                                                            const diff = original - revised
                                                                                            // Only show diff if both values exist/nonzero or if it makes sense
                                                                                            if (!v.price_note && !revisedValue) return null

                                                                                            return (
                                                                                                <span className={cn("text-xs font-medium ml-2", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                                                                    {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                                                                </span>
                                                                                            )
                                                                                        })()
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* EDIT MODE */}
                                                                            {isEditingAgenda && (
                                                                                <>
                                                                                    {isKYC && (
                                                                                        <Select value={v.kyc_result || ""} onValueChange={val => handleUpdateVendorData(v.id, 'kyc_result', val)}>
                                                                                            <SelectTrigger className="h-8 w-[100px] text-xs bg-white">
                                                                                                <SelectValue placeholder="Status" />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="Pass">Pass</SelectItem>
                                                                                                <SelectItem value="Fail">Fail</SelectItem>
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    )}

                                                                                    {(isPrice || isRevisedPrice) ? (
                                                                                        <div className="flex-1 flex items-center gap-2">
                                                                                            {isRevisedPrice && <span className="text-xs text-muted-foreground whitespace-nowrap">Revised:</span>}
                                                                                            <InputGroup className="h-8 flex-1">
                                                                                                <InputGroupAddon><InputGroupText>IDR</InputGroupText></InputGroupAddon>
                                                                                                <InputGroupInput
                                                                                                    className="h-8 text-xs bg-white"
                                                                                                    placeholder={isRevisedPrice ? formatNumber(v.price_note || "0") : "0"}
                                                                                                    value={formatNumber(isRevisedPrice ? (revisedValue || "") : (v[field!] || ""))}
                                                                                                    onChange={e => {
                                                                                                        // If usage is revised, we update revised_price_note
                                                                                                        const val = parseNumber(e.target.value)
                                                                                                        handleUpdateVendorData(v.id, field!, val)
                                                                                                    }}
                                                                                                />
                                                                                            </InputGroup>
                                                                                            {isRevisedPrice && (
                                                                                                (() => {
                                                                                                    const original = parseFloat(v.price_note || "0")
                                                                                                    const currentRevisedVal = (isRevisedPrice && (v.revised_price_note !== undefined && v.revised_price_note !== null)) ? v.revised_price_note : (v.price_note || "0")
                                                                                                    const revised = parseFloat(currentRevisedVal)
                                                                                                    const diff = original - revised

                                                                                                    if (!v.price_note) return null

                                                                                                    return (
                                                                                                        <span className={cn("text-xs font-medium w-[80px] text-right", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                                                                            {diff > 0 ? "+" : ""}{formatNumber(diff.toString())}
                                                                                                        </span>
                                                                                                    )
                                                                                                })()
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <Input
                                                                                            value={v[field!] || ""}
                                                                                            onChange={e => handleUpdateVendorData(v.id, field!, e.target.value)}
                                                                                            className="h-8 flex-1 text-xs bg-white"
                                                                                            placeholder={`Enter ${field && field.replace('_', ' ')}...`}
                                                                                        />
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* FINALIZE MODAL */}
            <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Completing a contract?</DialogTitle>
                        <DialogDescription>
                            All signatures are completed. Finalize by adding a Contract Number, Effective Date, and Expiry Date.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="contract_number" className="text-right">
                                Contract #
                            </Label>
                            <Input
                                id="contract_number"
                                value={finalizeContractNumber}
                                onChange={(e) => setFinalizeContractNumber(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="effective_date" className="text-right">
                                Effective Date
                            </Label>
                            <Input
                                id="effective_date"
                                type="date"
                                value={finalizeEffectiveDate}
                                onChange={(e) => setFinalizeEffectiveDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expiry_date" className="text-right">
                                Expiry Date
                            </Label>
                            <Input
                                id="expiry_date"
                                type="date"
                                value={finalizeExpiryDate}
                                onChange={(e) => setFinalizeExpiryDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFinalizeModal(false)}>Cancel</Button>
                        <Button onClick={handleFinalizeContract}>Save & Activate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
