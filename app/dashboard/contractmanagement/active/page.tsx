"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit } from "lucide-react"
import { format } from "date-fns"
import { ContractNav } from "@/components/contract/ContractNav"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface ActiveContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string | null
    version: number
    parent_contract_id: string | null
}



export default function ActiveContractsPage() {
    const router = useRouter()
    const [contracts, setContracts] = useState<ActiveContract[]>([])
    const [filteredContracts, setFilteredContracts] = useState<ActiveContract[]>([])
    const [loading, setLoading] = useState(true)
    const [activeFilter, setActiveFilter] = useState("all")

    // Amendment State
    const [showAmendmentModal, setShowAmendmentModal] = useState(false)
    const [selectedContract, setSelectedContract] = useState<ActiveContract | null>(null)
    const [creatingAmendment, setCreatingAmendment] = useState(false)

    useEffect(() => {
        fetchContracts()
    }, [])

    useEffect(() => {
        applyFilter(activeFilter)
    }, [contracts, activeFilter])

    const fetchContracts = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('id, title, contract_number, appointed_vendor, effective_date, expiry_date, version, parent_contract_id')
                .eq('status', 'Active') // Active status represents Completed contracts
                .order('expiry_date', { ascending: true })

            if (error) throw error
            setContracts(data || [])
        } catch (error: any) {
            console.error('Error fetching contracts:', error)
            alert('Failed to load contracts: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const applyFilter = (filter: string) => {
        const today = new Date().toISOString().split('T')[0]

        let filtered = contracts

        if (filter === 'not_expired') {
            filtered = contracts.filter(c => c.expiry_date && c.expiry_date >= today)
        } else if (filter === 'expired') {
            filtered = contracts.filter(c => c.expiry_date && c.expiry_date < today)
        } else if (filter === 'has_amendments') {
            filtered = contracts.filter(c => c.parent_contract_id !== null)
        }

        setFilteredContracts(filtered)
    }

    const calculateDaysUntilExpiry = (expiryDate: string | null) => {
        if (!expiryDate) return { days: 0, status: 'unknown', text: 'No expiry date' }

        const today = new Date()
        const expiry = new Date(expiryDate)
        const diffTime = expiry.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return {
                days: Math.abs(diffDays),
                status: 'expired',
                text: `Expired ${Math.abs(diffDays)} days ago`,
                variant: 'secondary' as const
            }
        } else if (diffDays < 30) {
            return {
                days: diffDays,
                status: 'critical',
                text: `${diffDays} days`,
                variant: 'destructive' as const
            }
        } else if (diffDays < 60) {
            return {
                days: diffDays,
                status: 'warning',
                text: `${diffDays} days`,
                variant: 'outline' as const
            }
        } else {
            return {
                days: diffDays,
                status: 'good',
                text: `${diffDays} days`,
                variant: 'default' as const
            }
        }
    }

    const handleViewContract = (id: string) => {
        router.push(`/dashboard/contractmanagement/ongoing/${id}`)
    }

    const handleInitiateAmendment = (contract: ActiveContract) => {
        setSelectedContract(contract)
        setShowAmendmentModal(true)
    }

    const handleCreateAmendment = async () => {
        if (!selectedContract) return

        try {
            setCreatingAmendment(true)

            // 1. Fetch full details of the original contract
            const { data: original, error: fetchError } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', selectedContract.id)
                .single()

            if (fetchError) throw fetchError

            // 2. Prepare new amendment payload
            const newVersion = (original.version || 0) + 1
            const amendmentData = {
                title: `${original.title} - Amendment ${newVersion}`,
                contract_number: original.contract_number, // Keep same number, or maybe add suffix logic if needed
                status: 'On Progress',
                parent_contract_id: original.id,
                version: newVersion,
                category: original.category,
                contract_type_id: original.contract_type_id,
                division: original.division,
                department: original.department,
                contract_amount: original.contract_amount,
                // Do not copy effective/expiry dates as those might change in amendment
                effective_date: null,
                expiry_date: null,
                created_by: original.created_by // Or current user? Ideally current user. Supabase default or handle via auth context if available. 
                // For now, let Supabase handle 'created_by' via default or trigger if set, or just copy instructions.
                // Assuming RLS handles current user on insert usually.
            }

            // Remove ID and timestamps
            // @ts-ignore
            delete amendmentData.id
            // @ts-ignore
            delete amendmentData.created_at
            // @ts-ignore
            delete amendmentData.updated_at

            // 3. Insert new contract (Amendment)
            const { data: newContract, error: insertError } = await supabase
                .from('contracts')
                .insert(amendmentData)
                .select()
                .single()

            if (insertError) throw insertError

            // 4. Copy Vendors (Important!)
            const { data: vendors } = await supabase
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', selectedContract.id)

            if (vendors && vendors.length > 0) {
                const vendorsToInsert = vendors.map(v => ({
                    contract_id: newContract.id,
                    vendor_name: v.vendor_name,
                    pic_name: v.pic_name,
                    pic_phone: v.pic_phone,
                    pic_email: v.pic_email,
                    is_appointed: v.is_appointed,
                    price_note: v.price_note,
                    // Reset evaluations? Or keep? Usually keep for reference or base.
                    tech_eval_note: v.tech_eval_note,
                    kyc_note: v.kyc_note
                }))
                await supabase.from('contract_vendors').insert(vendorsToInsert)
            }

            // 5. Create Default Amendment Agenda
            // Amendments typically have fewer steps than full contracts
            const amendmentSteps = [
                "Drafting Amendment",
                "Review Amendment",
                "Internal Contract Signature Process",
                "Vendor Contract Signature Process"
            ]

            const agendaItems = amendmentSteps.map(step => ({
                contract_id: newContract.id,
                step_name: step,
                status: 'Pending'
            }))

            await supabase.from('contract_bid_agenda').insert(agendaItems)

            // 6. Redirect
            setShowAmendmentModal(false)
            router.push(`/dashboard/contractmanagement/ongoing/${newContract.id}`)

        } catch (error: any) {
            console.error("Error creating amendment:", error)
            alert("Failed to create amendment: " + error.message)
        } finally {
            setCreatingAmendment(false)
        }
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Active Contracts</h1>
                    <p className="text-muted-foreground">Manage finalized and active contracts</p>
                </div>
            </div>

            <ContractNav />

            {/* Filter Tabs */}
            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All ({contracts.length})</TabsTrigger>
                    <TabsTrigger value="not_expired">
                        Not Expired ({contracts.filter(c => c.expiry_date && c.expiry_date >= new Date().toISOString().split('T')[0]).length})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                        Expired ({contracts.filter(c => c.expiry_date && c.expiry_date < new Date().toISOString().split('T')[0]).length})
                    </TabsTrigger>
                    <TabsTrigger value="has_amendments">
                        Has Amendments ({contracts.filter(c => c.parent_contract_id !== null).length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeFilter} className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contracts List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
                            ) : filteredContracts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No contracts found for this filter
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Contract Number</TableHead>
                                            <TableHead>Contract Name</TableHead>
                                            <TableHead>Vendor</TableHead>
                                            <TableHead>Effective Date</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead>Days Until Expiry</TableHead>
                                            <TableHead>Version</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredContracts.map((contract) => {
                                            const expiryInfo = calculateDaysUntilExpiry(contract.expiry_date)

                                            return (
                                                <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                                                    <TableCell className="font-medium">{contract.contract_number}</TableCell>
                                                    <TableCell>{contract.title}</TableCell>
                                                    <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                                    <TableCell>
                                                        {contract.effective_date ? format(new Date(contract.effective_date), 'dd MMM yyyy') : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {contract.expiry_date ? format(new Date(contract.expiry_date), 'dd MMM yyyy') : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={expiryInfo.variant}>
                                                            {expiryInfo.text}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {contract.parent_contract_id ? (
                                                            <Badge variant="outline">v{contract.version}</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">Original</span>
                                                        )}
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
                                                                    View Contract
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleInitiateAmendment(contract)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" />
                                                                    Create Amendment
                                                                </DropdownMenuItem>
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
                </TabsContent>
            </Tabs>

            {/* CREATE AMENDMENT MODAL */}
            <Dialog open={showAmendmentModal} onOpenChange={setShowAmendmentModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Amendment</DialogTitle>
                        <DialogDescription>
                            This will create a new draft amendment for <b>{selectedContract?.contract_number}</b> (v{(selectedContract?.version || 0) + 1}).
                            <br /><br />
                            Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAmendmentModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateAmendment} disabled={creatingAmendment}>
                            {creatingAmendment ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Amendment"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
