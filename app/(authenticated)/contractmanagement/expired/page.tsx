"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit } from "lucide-react"
import { format } from "date-fns"
import { ContractNav } from "@/components/contract/ContractNav"

interface ExpiredContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string | null
    version: number
    parent_contract_id: string | null
}

export default function ExpiredContractsPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [contracts, setContracts] = useState<ExpiredContract[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchContracts()
    }, [])

    const fetchContracts = async () => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split('T')[0]
            const { data, error } = await supabase
                .from('contracts')
                .select('id, title, contract_number, appointed_vendor, effective_date, expiry_date, version, parent_contract_id')
                .eq('status', 'Active')
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

    const calculateDaysExpired = (expiryDate: string | null) => {
        if (!expiryDate) return { days: 0, text: 'No expiry date' }
        const today = new Date()
        const expiry = new Date(expiryDate)
        const diffTime = today.getTime() - expiry.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
            days: diffDays,
            text: `Expired ${diffDays} days ago`,
            variant: 'secondary' as const
        }
    }

    const handleViewContract = (id: string) => {
        router.push(`/bid-agenda/${id}`)
    }

    const handleCreateAmendment = (id: string) => {
        router.push(`/contractmanagement/active/${id}/amend`)
    }

    const handleRenew = (id: string) => {
        router.push(`/contractmanagement/active/${id}/amend`)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Expired Contracts</h1>
                    <p className="text-muted-foreground">Review contracts that have passed their expiry date</p>
                </div>
            </div>

            <ContractNav />

            <Card>
                <CardHeader>
                    <CardTitle>Expired Contracts List ({contracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
                    ) : contracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No expired contracts found
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => {
                                    const expiredInfo = calculateDaysExpired(contract.expiry_date)

                                    return (
                                        <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50 bg-red-50/50">
                                            <TableCell className="font-medium">{contract.contract_number}</TableCell>
                                            <TableCell>{contract.title}</TableCell>
                                            <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                            <TableCell>
                                                {contract.effective_date ? format(new Date(contract.effective_date), 'dd MMM yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="text-red-600 font-medium">
                                                {contract.expiry_date ? format(new Date(contract.expiry_date), 'dd MMM yyyy') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                                                    {expiredInfo.text}
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
                                                        <DropdownMenuItem onClick={() => handleRenew(contract.id)}>
                                                            <FileEdit className="mr-2 h-4 w-4" />
                                                            Renew Contract
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
        </div>
    )
}
