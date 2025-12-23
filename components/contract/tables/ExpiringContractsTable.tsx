"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit, AlertTriangle } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { AmendWorkflowModal } from "@/components/contract/AmendWorkflowModal"
import { toast } from "sonner"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"

interface ExpiringContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
}

export function ExpiringContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [contracts, setContracts] = useState<ExpiringContract[]>([])
    const [loading, setLoading] = useState(true)
    const [criticalCount, setCriticalCount] = useState(0)
    const [contractsWithAmendment, setContractsWithAmendment] = useState<Set<string>>(new Set())

    // Amendment State
    const [isAmendModalOpen, setIsAmendModalOpen] = useState(false)
    const [selectedContractForAmend, setSelectedContractForAmend] = useState<ExpiringContract | null>(null)
    const [isCreatingAmendment, setIsCreatingAmendment] = useState(false)

    // Finish State
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false)
    const [selectedContractForFinish, setSelectedContractForFinish] = useState<ExpiringContract | null>(null)
    const [finishContractNumber, setFinishContractNumber] = useState("")
    const [finishEffectiveDate, setFinishEffectiveDate] = useState("")
    const [finishExpiryDate, setFinishExpiryDate] = useState("")
    const [finishRemarks, setFinishRemarks] = useState("")
    const [finishReferenceNumber, setFinishReferenceNumber] = useState("")

    useEffect(() => {
        fetchExpiringContracts()
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

    const fetchExpiringContracts = async () => {
        setLoading(true)
        try {
            const today = new Date()
            const futureDate = new Date()
            futureDate.setDate(today.getDate() + 90)

            const { data, error } = await supabase
                .from('contracts')
                .select('id, title, contract_number, appointed_vendor, effective_date, expiry_date, version')
                .eq('status', 'Active')
                .gte('expiry_date', today.toISOString().split('T')[0])
                .lte('expiry_date', futureDate.toISOString().split('T')[0])
                .order('expiry_date', { ascending: true })

            if (error) throw error

            setContracts(data || [])

            const critical = (data || []).filter((c: ExpiringContract) => {
                const days = differenceInDays(new Date(c.expiry_date), today)
                return days < 30
            })
            setCriticalCount(critical.length)
        } catch (error: any) {
            console.error('Error fetching contracts:', error)
            toast.error('Failed to load contracts', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const calculateDaysUntilExpiry = (expiryDate: string) => {
        const today = new Date()
        const expiry = new Date(expiryDate)
        const days = differenceInDays(expiry, today)

        if (days < 30) {
            return {
                days,
                status: 'critical',
                text: `${days} days`,
                variant: 'destructive' as const,
                color: 'text-red-600'
            }
        } else if (days < 60) {
            return {
                days,
                status: 'warning',
                text: `${days} days`,
                variant: 'outline' as const,
                color: 'text-yellow-600'
            }
        } else {
            return {
                days,
                status: 'good',
                text: `${days} days`,
                variant: 'secondary' as const,
                color: 'text-blue-600'
            }
        }
    }

    const handleViewContract = (id: string) => {
        router.push(`/bid-agenda/${id}`)
    }

    const handleAmendClick = (contract: ExpiringContract) => {
        setSelectedContractForAmend(contract)
        setIsAmendModalOpen(true)
    }

    const handleConfirmAmend = async (reason: string) => {
        if (!selectedContractForAmend) return

        try {
            setIsCreatingAmendment(true)
            const original = selectedContractForAmend

            // Fetch full details
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
                contract_summary: `Amendment Reason: ${reason}`,
                effective_date: null,
                expiry_date: null
            }

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

            // Copy Vendors
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

            // Create Default Amendment Agenda
            const amendmentSteps = ["Drafting Amendment", "Review Amendment", "Internal Contract Signature Process", "Vendor Contract Signature Process"]
            const agendaItems = amendmentSteps.map(step => ({
                contract_id: newContract.id,
                step_name: step,
                status: 'Pending'
            }))
            await supabase.from('contract_bid_agenda').insert(agendaItems)

            setIsAmendModalOpen(false)
            router.push(`/contractmanagement/ongoing/${newContract.id}`)

        } catch (error: any) {
            console.error("Error creating amendment:", error)
            toast.error("Failed to create amendment", { description: error.message })
        } finally {
            setIsCreatingAmendment(false)
        }
    }

    const handleFinishClick = (contract: ExpiringContract) => {
        setSelectedContractForFinish(contract)
        setFinishContractNumber(contract.contract_number)
        setFinishEffectiveDate(contract.effective_date || "")
        setFinishExpiryDate(contract.expiry_date || "")
        setFinishRemarks("")
        setFinishReferenceNumber("")
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
            fetchExpiringContracts()
            toast.success("Contract updated/finished successfully!")

        } catch (error: any) {
            console.error("Error finishing contract:", error)
            toast.error("Failed to finish contract", { description: error.message })
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Expiring Contracts</h2>
                <p className="text-muted-foreground">Contracts expiring within the next 90 days</p>
            </div>

            {criticalCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900">Urgent Action Required</h3>
                            <p className="text-sm text-red-800 mt-1">
                                {criticalCount} contract{criticalCount > 1 ? 's' : ''} expiring in less than 30 days.
                                Please review and take action immediately.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Critical (&lt; 30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {contracts.filter((c: ExpiringContract) => differenceInDays(new Date(c.expiry_date), new Date()) < 30).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Warning (30-60 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {contracts.filter((c: ExpiringContract) => {
                                const days = differenceInDays(new Date(c.expiry_date), new Date())
                                return days >= 30 && days < 60
                            }).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Notice (60-90 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {contracts.filter((c: ExpiringContract) => differenceInDays(new Date(c.expiry_date), new Date()) >= 60).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expiring Contracts ({contracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
                    ) : contracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No contracts expiring in the next 90 days
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contract Number</TableHead>
                                    <TableHead>Contract Name</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Days Until Expiry</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => {
                                    const expiryInfo = calculateDaysUntilExpiry(contract.expiry_date)

                                    return (
                                        <TableRow
                                            key={contract.id}
                                            className={`cursor-pointer hover:bg-muted/50 ${expiryInfo.status === 'critical' ? 'bg-red-50' : ''}`}
                                        >
                                            <TableCell className="font-medium">{contract.contract_number}</TableCell>
                                            <TableCell>{contract.title}</TableCell>
                                            <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                            <TableCell>
                                                <span className={expiryInfo.color}>
                                                    {format(new Date(contract.expiry_date), 'dd MMM yyyy')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={expiryInfo.variant}>
                                                    {expiryInfo.text}
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
                                                                    Amend
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleFinishClick(contract)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" />
                                                                    Finish
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
                isAmendment={false} // Expiring usually generic
                referenceContractNumber={finishReferenceNumber}
                onReferenceNumberChange={setFinishReferenceNumber}
                simpleFinish={true}
            />
        </div >
    )
}
