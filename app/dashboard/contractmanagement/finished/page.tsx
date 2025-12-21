"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
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
import { MoreVertical, Eye } from "lucide-react"
import { format } from "date-fns"
import { ContractNav } from "@/components/contract/ContractNav"

interface FinishedContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string | null
    contract_summary: string | null
    version: number
    parent_contract_id: string | null
}

export default function FinishedContractsPage() {
    const router = useRouter()
    const [contracts, setContracts] = useState<FinishedContract[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchContracts()
    }, [])

    const fetchContracts = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('id, title, contract_number, appointed_vendor, effective_date, expiry_date, version, parent_contract_id, contract_summary')
                .eq('status', 'Completed')
                .order('updated_at', { ascending: false })

            if (error) throw error
            setContracts(data || [])
        } catch (error: any) {
            console.error('Error fetching contracts:', error)
            alert('Failed to load contracts: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleViewContract = (id: string) => {
        router.push(`/dashboard/contractmanagement/ongoing/${id}`)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Finished Contracts</h1>
                    <p className="text-muted-foreground">Archive of completed and finalized contracts</p>
                </div>
            </div>

            <ContractNav />

            <Card>
                <CardHeader>
                    <CardTitle>Finished Contracts List ({contracts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
                    ) : contracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No finished contracts found
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
                                    <TableHead>Summary/Remarks</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => (
                                    <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50 bg-gray-50/50">
                                        <TableCell className="font-medium bg-gray-100">{contract.contract_number}</TableCell>
                                        <TableCell>{contract.title}</TableCell>
                                        <TableCell>{contract.appointed_vendor || '-'}</TableCell>
                                        <TableCell>
                                            {contract.effective_date ? format(new Date(contract.effective_date), 'dd MMM yyyy') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {contract.expiry_date ? format(new Date(contract.expiry_date), 'dd MMM yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">
                                            {contract.contract_summary || '-'}
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
                                                        View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
