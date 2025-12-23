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

interface ExpiredContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
    parent_contract_id: string | null
}

export function ExpiredContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [contracts, setContracts] = useState<ExpiredContract[]>([])
    const [loading, setLoading] = useState(true)
    const [contractsWithAmendment, setContractsWithAmendment] = useState<Set<string>>(new Set())

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

    useEffect(() => {
        fetchExpiredContracts()
        checkAmendmentsInProgress()
    }, [])

    const checkAmendmentsInProgress = async () => {
        const { data } = await supabase
            .from('contracts')
            .select('parent_contract_id')
            .eq('status', 'On Progress')
            .not('parent_contract_id', 'is', null)

        if (data) {
            const parentIds = new Set(data.map(d => d.parent_contract_id as string))
            setContractsWithAmendment(parentIds)
        }
    }

    const fetchExpiredContracts = async () => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('contracts')
                .select('id, title, contract_number, appointed_vendor, effective_date, expiry_date, version, parent_contract_id')
                .eq('status', 'Active') // Expired are still "Active" status wise, but past date
                .lt('expiry_date', today)
                .order('expiry_date', { ascending: false }) // Most recently expired first

            if (error) throw error
            setContracts(data || [])
        } catch (error: any) {
            console.error('Error fetching contracts:', error)
            alert('Failed to load contracts: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

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
            const original = selectedContractForAmend

            const { data: fullOriginal, error: fetchError } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', original.id)
                .single()

            if (fetchError) throw fetchError

            const newVersion = (fullOriginal.version || 0) + 1
            const amendmentData = {
                title: `${fullOriginal.title} - Amendment ${newVersion}`,
                contract_number: fullOriginal.contract_number,
                status: 'On Progress',
                parent_contract_id: fullOriginal.id,
                version: newVersion,
                category: fullOriginal.category,
                contract_type_id: fullOriginal.contract_type_id,
                division: fullOriginal.division,
                department: fullOriginal.department,
                contract_summary: `Amendment Reason (Expired): ${reason}`,
                effective_date: null,
                expiry_date: null,
                created_by: (await supabase.auth.getUser()).data.user?.id
            }

            if (!amendmentData.created_by) throw new Error("No authenticated user found")

            // @ts-ignore
            delete amendmentData.id
            // @ts-ignore
            delete amendmentData.created_at
            // @ts-ignore
            delete amendmentData.updated_at

            const { data: newContract, error: insertError } = await supabase
                .from('contracts')
                .insert(amendmentData)
                .select()
                .single()

            if (insertError) throw insertError

            // Copy Vendors (Simplified for brevity, assuming same logic as others)
            const { data: vendors } = await supabase
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', original.id)

            if (vendors && vendors.length > 0) {
                const vendorsToInsert = vendors.map(v => ({
                    contract_id: newContract.id,
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

            const amendmentSteps = ["Drafting Amendment", "Review Amendment", "Internal Contract Signature Process", "Vendor Contract Signature Process"]
            const agendaItems = amendmentSteps.map(step => ({
                contract_id: newContract.id,
                step_name: step,
                status: 'Pending'
            }))
            await supabase.from('contract_bid_agenda').insert(agendaItems)

            setIsAmendModalOpen(false)
            router.push(`/bid-agenda/${newContract.id}`)
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
        setFinishReferenceNumber(contract.parent_contract_id ? contract.contract_number : "")
        setIsFinishModalOpen(true)
    }

    const handleConfirmFinish = async () => {
        if (!selectedContractForFinish) return

        try {
            const updates = {
                contract_number: finishContractNumber,
                effective_date: finishEffectiveDate,
                expiry_date: finishExpiryDate,
                contract_summary: finishRemarks,
                reference_contract_number: finishReferenceNumber,
                status: 'Completed'
            }

            const { error } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', selectedContractForFinish.id)

            if (error) throw error

            setIsFinishModalOpen(false)
            setFinishRemarks("") // Clear remarks after successful finish
            toast.success("Contract finished successfully!")
            fetchExpiredContracts()

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
                                                    {contractsWithAmendment.has(contract.id) && (
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
                                                        {!contractsWithAmendment.has(contract.id) && (
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
                isAmendment={selectedContractForFinish?.parent_contract_id !== null}
                referenceContractNumber={finishReferenceNumber}
                onReferenceNumberChange={setFinishReferenceNumber}
                simpleFinish={true}
            />
        </div>
    )
}
