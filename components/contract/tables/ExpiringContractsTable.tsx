"use client"

import { useQueryClient } from "@tanstack/react-query"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit, AlertTriangle, Search } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { AmendWorkflowModal } from "@/components/contract/AmendWorkflowModal"
import { toast } from "sonner"
import { FinalizeContractModal } from "@/components/contract/FinalizeContractModal"
import { Input } from "@/components/ui/input"
import { getVersionBadgeColor, getDivisionColor, formatCurrency } from "@/lib/contractUtils"
import { ContractService } from "@/services/contractService"
import { ContractActionsMenu } from "@/components/contract/ContractActionsMenu"
import { useAuth } from "@/context/AuthContext"
import { isAdmin } from "@/lib/adminUtils"

interface ExpiringContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
    parent_id: string
    user_name: string | null
    contract_value: number
    cost_savings: number
    division: string | null
}

import { useQuery } from "@tanstack/react-query"

// ... imports

// ... interface

export function ExpiringContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const queryClient = useQueryClient()
    const { profile } = useAuth()
    // const [contracts, setContracts] = useState<ExpiringContract[]>([]) // Removed
    const [filteredContracts, setFilteredContracts] = useState<ExpiringContract[]>([])
    // const [loading, setLoading] = useState(true) // Removed
    const [criticalCount, setCriticalCount] = useState(0)
    // const [contractsWithAmendment, setContractsWithAmendment] = useState<Set<string>>(new Set()) // Removed/Replaced
    const [searchTerm, setSearchTerm] = useState("")

    // ... other states
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

    // REACT QUERY: Fetch Expiring Contracts
    const { data: contracts = [], isLoading: loading } = useQuery({
        queryKey: ['expiringContracts'],
        queryFn: async () => {
            const today = new Date()
            const futureDate = new Date()
            futureDate.setDate(today.getDate() + 90)

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
                    final_contract_amount,
                    cost_saving,
                    division,
                    parent:contract_parents(contract_number, created_by, profiles:created_by (full_name)),
                    contract_vendors(vendor_name, is_appointed)
                `)
                .eq('status', 'Active')
                .lte('expiry_date', futureDate.toISOString())
                .order('expiry_date', { ascending: true })

            if (error) throw error

            return (data || []).map((c: any) => {
                const vendors = c.contract_vendors || []
                const appointed = vendors.find((v: any) => v.is_appointed)?.vendor_name

                return {
                    id: c.id,
                    title: c.title,
                    contract_number: c.parent?.contract_number || '-',
                    appointed_vendor: appointed || null,
                    effective_date: c.effective_date,
                    expiry_date: c.expiry_date,
                    version: c.version,
                    parent_id: c.parent_id,
                    user_name: c.parent?.profiles?.full_name,
                    contract_value: c.final_contract_amount || 0,
                    cost_savings: c.cost_saving || 0,
                    division: c.division
                }
            })
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

        // Calculate critical count based on fetched contracts
        const today = new Date()
        const critical = contracts.filter((c: any) => {
            const days = differenceInDays(new Date(c.expiry_date), today)
            return days < 30
        }).length
        setCriticalCount(critical)

    }, [searchTerm, contracts])


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
            const originalId = selectedContractForAmend.id
            const userId = (await supabase.auth.getUser()).data.user?.id
            if (!userId) throw new Error("No authenticated user found")

            // Use ContractService to create amendment
            // First get full original details
            const original = await ContractService.getContract(supabase, originalId)
            if (!original) throw new Error("Original contract not found")

            const newVersionNum = (original.version || 0) + 1

            // Manual Insert for Amendment (same as ExpiredTable)
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
                contract_summary: `Amendment Reason: ${reason}`,
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

            // NO Agendas for clean slate as per previous requirements for Amendment

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
                // contract_number: finishContractNumber, // Update Parent?
                effective_date: finishEffectiveDate,
                expiry_date: finishExpiryDate,
                contract_summary: finishRemarks,
                // reference_contract_number: finishReferenceNumber,
                status: 'Completed'
            }

            await ContractService.updateContract(supabase, selectedContractForFinish.id, {
                ...updates,
                contract_number: finishContractNumber
            } as any)

            setIsFinishModalOpen(false)
            setIsFinishModalOpen(false)
            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey: ['expiringContracts'] })
            toast.success("Contract updated/finished successfully!")

        } catch (error: any) {
            console.error("Error finishing contract:", error)
            toast.error("Failed to finish contract", { description: error.message })
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await ContractService.deleteContract(supabase, id)
            toast.success("Contract deleted successfully")
            queryClient.invalidateQueries({ queryKey: ['expiringContracts'] })
        } catch (error: any) {
            toast.error("Failed to delete contract", { description: error.message })
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
                                    <TableHead>Division</TableHead>
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
                                                        {contractsWithAmendment.has(contract.parent_id) && (
                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-1 py-0 h-5">
                                                                Amend in Progress
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">{contract.contract_number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{contract.user_name || '-'}</TableCell>
                                            <TableCell>
                                                {contract.division && (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] px-1 py-0 h-5 border ${getDivisionColor(contract.division)}`}
                                                    >
                                                        {contract.division}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                            <TableCell>
                                                {contract.contract_value > 0 ? formatCurrency(contract.contract_value) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {contract.cost_savings > 0 ? formatCurrency(contract.cost_savings) : "-"}
                                            </TableCell>
                                            <TableCell>{contract.effective_date ? format(new Date(contract.effective_date), 'dd MMM yyyy') : '-'}</TableCell>
                                            <TableCell>
                                                <span className={expiryInfo.color}>
                                                    {format(new Date(contract.expiry_date), 'dd MMM yyyy')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <ContractStatusBadge status={expiryInfo.text} />
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getVersionBadgeColor(contract.version)}>
                                                    v{contract.version}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ContractActionsMenu
                                                    contractId={contract.id}
                                                    type="active"
                                                    canDelete={isAdmin(profile?.position)}
                                                    isAmendDisabled={contractsWithAmendment.has(contract.parent_id)}
                                                    onAmend={() => handleAmendClick(contract)}
                                                    onFinish={() => handleFinishClick(contract)}
                                                    onDelete={async () => {
                                                        await handleDelete(contract.id)
                                                    }}
                                                />
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
