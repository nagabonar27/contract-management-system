"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { AmendWorkflowModal } from "@/components/contract/AmendWorkflowModal"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"
import { ContractService } from "@/services/contractService"

interface ExpiredContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
    parent_id: string
}

import { useQuery } from "@tanstack/react-query"

// ... imports

// ... interface

export function ExpiredContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    // const [contracts, setContracts] = useState<ExpiredContract[]>([]) // Removed
    // const [loading, setLoading] = useState(true) // Removed
    // const [contractsWithAmendment, setContractsWithAmendment] = useState<Set<string>>(new Set()) // Removed

    // Amendment State
    const [isAmendModalOpen, setIsAmendModalOpen] = useState(false)
    const [selectedContractForAmend, setSelectedContractForAmend] = useState<ExpiredContract | null>(null)
    const [isCreatingAmendment, setIsCreatingAmendment] = useState(false)

    // Finish State
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false)
    const [selectedContractForFinish, setSelectedContractForFinish] = useState<ExpiredContract | null>(null)
    const [finishContractNumber, setFinishContractNumber] = useState("")
    const [finishEffectiveDate, setFinishEffectiveDate] = useState("")
    const [finishExpiryDate, setFinishExpiryDate] = useState("")
    const [finishRemarks, setFinishRemarks] = useState("")
    const [finishReferenceNumber, setFinishReferenceNumber] = useState("")

    // REACT QUERY: Fetch Expired Contracts
    const { data: contracts = [], isLoading: loading, refetch: refetchContracts } = useQuery({
        queryKey: ['expiredContracts'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('contract_versions')
                .select(`
                    id, 
                    title, 
                    appointed_vendor, 
                    effective_date, 
                    expiry_date, 
                    version, 
                    parent_id,
                    parent:contract_parents(contract_number, created_by)
                `)
                .eq('status', 'Active')
                .lt('expiry_date', today)
                .order('expiry_date', { ascending: false })

            if (error) throw error

            return data.map((d: any) => ({
                id: d.id,
                title: d.title,
                contract_number: d.parent?.contract_number || '-',
                appointed_vendor: d.appointed_vendor,
                effective_date: d.effective_date,
                expiry_date: d.expiry_date,
                version: d.version,
                parent_id: d.parent_id
            }))
        }
    })

    // REACT QUERY: Check Amendments
    const { data: contractsWithAmendment = new Set() } = useQuery({
        queryKey: ['amendmentsInProgress'],
        queryFn: async () => {
            const { data } = await supabase
                .from('contract_versions')
                .select('parent_id')
                .eq('status', 'On Progress')
                .not('parent_id', 'is', null)

            if (data) {
                return new Set(data.map(d => d.parent_id as string))
            }
            return new Set<string>()
        }
    })

    // Removed useEffects and manual fetch functions

    const calculateDaysOverdue = (expiryDate: string) => {
        const today = new Date()
        const expiry = new Date(expiryDate)
        const days = differenceInDays(today, expiry) // Positive means overdue
        return days
    }

    const handleViewContract = (id: string) => {
        router.push(`/bid-agenda/${id}`)
    }

    const handleAmendClick = (contract: ExpiredContract) => {
        setSelectedContractForAmend(contract)
        setIsAmendModalOpen(true)
    }

    const handleConfirmAmend = async (reason: string) => {
        if (!selectedContractForAmend) return

        try {
            setIsCreatingAmendment(true)
            const originalId = selectedContractForAmend.id
            const userId = (await supabase.auth.getUser()).data.user?.id
            if (!userId) throw new Error("No authenticated user found")

            // Use ContractService to create amendment
            // First get full original details
            const original = await ContractService.getContract(supabase, originalId)
            if (!original) throw new Error("Original contract not found")

            const newVersionNum = (original.version || 0) + 1

            // Create the new version
            // See notes below about why manual Insert:
            const amendmentPayload = {
                parent_id: original.parent_id,
                version: newVersionNum,
                is_current: true, // This will be the new current one
                title: `${original.title} - Amendment ${newVersionNum}`,
                status: 'On Progress',
                current_step: 'Drafting Amendment',
                category: original.category,
                division: original.division,
                department: original.department,
                pt_id: original.pt_id,
                contract_type_id: original.contract_type_id,
                contract_summary: `Amendment Reason (Expired): ${reason}`,
                is_cr: original.is_cr,
                is_on_hold: false,
                is_anticipated: original.is_anticipated,
                // Inherited fields logic
                effective_date: null,
                expiry_date: null
            }

            const { data: newVersion, error: insertError } = await supabase
                .from('contract_versions')
                .insert(amendmentPayload)
                .select()
                .single()

            if (insertError) throw insertError

            // Log change
            await ContractService.logChange(supabase, newVersion.id, userId, 'CREATE', amendmentPayload)

            // Copy Vendors
            const { data: vendors } = await supabase
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', originalId)

            if (vendors && vendors.length > 0) {
                const vendorsToInsert = vendors.map(v => ({
                    contract_id: newVersion.id,
                    vendor_name: v.vendor_name,
                    pic_name: v.pic_name,
                    pic_phone: v.pic_phone,
                    pic_email: v.pic_email,
                    is_appointed: v.is_appointed,
                    price_note: v.price_note,
                    tech_eval_note: v.tech_eval_note,
                    kyc_note: v.kyc_note
                }))
                await supabase.from('contract_vendors').insert(vendorsToInsert)
            }

            // Seed Amendment Agenda
            const amendmentSteps = ["Drafting Amendment", "Review Amendment", "Internal Contract Signature Process", "Vendor Contract Signature Process"]
            const agendaItems = amendmentSteps.map((step, index) => ({
                contract_id: newVersion.id,
                step_name: step,
                status: index === 0 ? 'On Progress' : 'Pending',
                start_date: index === 0 ? new Date().toISOString() : null,
                created_by: userId
            }))
            await supabase.from('contract_bid_agenda').insert(agendaItems)

            setIsAmendModalOpen(false)
            toast.success("Amendment created successfully")
            router.push(`/bid-agenda/${newVersion.id}`)

        } catch (error: any) {
            console.error("Error creating amendment:", error)
            toast.error("Failed to create amendment", { description: error.message })
        } finally {
            setIsCreatingAmendment(false)
        }
    }

    const handleFinishClick = (contract: ExpiredContract) => {
        setSelectedContractForFinish(contract)
        setFinishContractNumber(contract.contract_number)
        setFinishEffectiveDate(contract.effective_date || "")
        setFinishExpiryDate(contract.expiry_date || "")
        setFinishRemarks("")
        setFinishReferenceNumber(contract.contract_number)
        setIsFinishModalOpen(true)
    }

    const handleConfirmFinish = async () => {
        if (!selectedContractForFinish) return

        try {
            const updates = {
                effective_date: finishEffectiveDate,
                expiry_date: finishExpiryDate,
                contract_summary: finishRemarks,
                status: 'Completed'
            }

            await ContractService.updateContract(supabase, selectedContractForFinish.id, {
                ...updates,
                contract_number: finishContractNumber
            } as any)

            setIsFinishModalOpen(false)
            setFinishRemarks("")
            toast.success("Contract finished successfully!")
            refetchContracts()

        } catch (error: any) {
            console.error("Error finishing contract:", error)
            toast.error("Failed to finish contract", { description: error.message })
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Expired Contracts</h2>
                <p className="text-muted-foreground">Active contracts that have passed their expiry date.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expired Contracts ({contracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : contracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No expired contracts found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contract Number</TableHead>
                                    <TableHead>Contract Name</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Overdue By</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => {
                                    const daysOverdue = calculateDaysOverdue(contract.expiry_date)

                                    return (
                                        <TableRow
                                            key={contract.id}
                                            className="cursor-pointer hover:bg-muted/50 bg-red-50/30"
                                        >
                                            <TableCell className="font-medium">{contract.contract_number}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {contract.title}
                                                    {contractsWithAmendment.has(contract.parent_id) && (
                                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                                            Amend in Progress
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                            <TableCell className="text-red-600 font-medium">
                                                {format(new Date(contract.expiry_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="destructive">
                                                    {daysOverdue} days
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">v{contract.version}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleViewContract(contract.id)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Open Bid Agenda
                                                        </DropdownMenuItem>
                                                        {!contractsWithAmendment.has(contract.parent_id) && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleAmendClick(contract)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" />
                                                                    Amend (Renewal)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleFinishClick(contract)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" />
                                                                    Finish/Close
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AmendWorkflowModal
                open={isAmendModalOpen}
                onOpenChange={setIsAmendModalOpen}
                contractTitle={selectedContractForAmend?.title || ""}
                onConfirm={handleConfirmAmend}
                isCreating={isCreatingAmendment}
            />

            <FinalizeContractModal
                open={isFinishModalOpen}
                onOpenChange={setIsFinishModalOpen}
                contractNumber={finishContractNumber}
                effectiveDate={finishEffectiveDate}
                expiryDate={finishExpiryDate}
                contractSummary={finishRemarks}
                onContractNumberChange={setFinishContractNumber}
                onEffectiveDateChange={setFinishEffectiveDate}
                onExpiryDateChange={setFinishExpiryDate}
                onContractSummaryChange={setFinishRemarks}
                onFinalize={handleConfirmFinish}
                isAmendment={selectedContractForFinish?.version ? selectedContractForFinish.version > 1 : false}
                referenceContractNumber={finishReferenceNumber}
                onReferenceNumberChange={setFinishReferenceNumber}
                simpleFinish={true}
            />
        </div>
    )
}
