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
                .eq('status', 'Active')
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

    const handleCreateAmendment = (id: string) => {
        router.push(`/contract-management/active/${id}/amend`)
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
                                                                <DropdownMenuItem onClick={() => handleCreateAmendment(contract.id)}>
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
        </div>
    )
}
