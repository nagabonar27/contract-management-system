"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit, AlertTriangle, Search } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { AmendWorkflowModal } from "@/components/contract/AmendWorkflowModal"
import { toast } from "sonner"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"
import { Input } from "@/components/ui/input"

interface ExpiringContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
    parent_contract_id: string | null
    user_name: string | null
}

export function ExpiringContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [contracts, setContracts] = useState<ExpiringContract[]>([])
    const [filteredContracts, setFilteredContracts] = useState<ExpiringContract[]>([])
    const [loading, setLoading] = useState(true)
    const [criticalCount, setCriticalCount] = useState(0)
    const [contractsWithAmendment, setContractsWithAmendment] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState("")

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

    useEffect(() => {
        if (!searchTerm) {
            setFilteredContracts(contracts)
        } else {
            const lowerComp = searchTerm.toLowerCase()
            setFilteredContracts(contracts.filter(c =>
                c.title?.toLowerCase().includes(lowerComp) ||
                c.contract_number?.toLowerCase().includes(lowerComp) ||
                c.appointed_vendor?.toLowerCase().includes(lowerComp) ||
                c.user_name?.toLowerCase().includes(lowerComp)
            ))
        }
    }, [searchTerm, contracts])

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
                .select(`
                    id, 
                    title, 
                    contract_number, 
                    appointed_vendor, 
                    effective_date, 
                    expiry_date, 
                    version,
                    parent_contract_id,
                    final_contract_amount,
                    cost_saving,
                    profiles:created_by (full_name)
                `)
                .eq('status', 'Active')
                .lte('expiry_date', futureDate.toISOString())
                .order('expiry_date', { ascending: true })

            if (error) throw error

            const formatted = (data || []).map((c: any) => ({
                ...c,
                user_name: c.profiles?.full_name,
                contract_value: c.final_contract_amount || 0,
                cost_savings: c.cost_saving || 0
            }))

            setContracts(formatted)
            setFilteredContracts(formatted)

            const critical = formatted.filter((c: any) => {
                const days = differenceInDays(new Date(c.expiry_date), today)
                return days < 30
            }).length
            setCriticalCount(critical)
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

    const getVersionBadgeColor = (version: number) => {
        switch (version) {
            case 1: return "bg-gray-100 text-gray-800 border-gray-200"
            case 2: return "bg-blue-100 text-blue-800 border-blue-200"
            case 3: return "bg-green-100 text-green-800 border-green-200"
            case 4: return "bg-orange-100 text-orange-800 border-orange-200"
            case 5: return "bg-red-100 text-red-800 border-red-200"
            default: return "bg-purple-100 text-purple-800 border-purple-200"
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

            // Fetch Amendment Contract Type
            const { data: amendmentType } = await supabase
                .from('contract_types')
                .select('id')
                .ilike('name', '%Amendment%')
                .single()

            const newVersion = (fullOriginal.version || 0) + 1
            const amendmentData = {
                title: `${fullOriginal.title} - Amendment ${newVersion}`,
                contract_number: fullOriginal.contract_number,
                status: 'On Progress',
                parent_contract_id: fullOriginal.id,
                version: newVersion,
                category: fullOriginal.category,
                pt_id: fullOriginal.pt_id,
                contract_type_id: amendmentType?.id || fullOriginal.contract_type_id,
                division: fullOriginal.division,
                department: fullOriginal.department,
                contract_summary: `Amendment Reason: ${reason}`,
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

            // NO AGENDA CREATION for clean slate

            setIsAmendModalOpen(false)
            router.push(`/bid-agenda/${newContract.id}`)

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
                            {contracts.filter((c) => differenceInDays(new Date(c.expiry_date), new Date()) < 30).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Warning (30-60 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {contracts.filter((c) => {
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
                            {contracts.filter((c) => differenceInDays(new Date(c.expiry_date), new Date()) >= 60).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Input */}
            <div className="flex items-center space-x-2">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expiring Contracts ({filteredContracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
                    ) : filteredContracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No contracts found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contract Name</TableHead>
                                    <TableHead>PIC</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Contract Value</TableHead>
                                    <TableHead>Cost Saving</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Days Until Expiry</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredContracts.map((contract: any) => {
                                    const expiryInfo = calculateDaysUntilExpiry(contract.expiry_date)

                                    return (
                                        <TableRow
                                            key={contract.id}
                                            className={`cursor-pointer hover:bg-muted/50 ${expiryInfo.status === 'critical' ? 'bg-red-50' : ''}`}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span>{contract.title}</span>
                                                        {contractsWithAmendment.has(contract.id) && (
                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-1 py-0 h-5">
                                                                Amend in Progress
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{contract.contract_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{contract.user_name || '-'}</TableCell>
                                            <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                            <TableCell>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(contract.contract_value)}
                                            </TableCell>
                                            <TableCell>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(contract.cost_savings)}
                                            </TableCell>
                                            <TableCell>{contract.effective_date ? format(new Date(contract.effective_date), 'dd MMM yyyy') : '-'}</TableCell>
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
                                                <Badge variant="outline" className={getVersionBadgeColor(contract.version)}>
                                                    v{contract.version}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
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
                                                                        Amend Contract
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleFinishClick(contract)}>
                                                                        <FileEdit className="mr-2 h-4 w-4" />
                                                                        Finish Contract
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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
