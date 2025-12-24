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
import { MoreVertical, Eye } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface FinishedContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string | null
    contract_summary: string | null
    version: number
    parent_id: string
}

import { useQuery } from "@tanstack/react-query"

// ... imports

// ... interface

export function FinishedContractsTable() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    // const [contracts, setContracts] = useState<FinishedContract[]>([]) // Removed
    // const [loading, setLoading] = useState(true) // Removed

    // REACT QUERY
    const { data: contracts = [], isLoading: loading } = useQuery({
        queryKey: ['finishedContracts'],
        queryFn: async () => {
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
                    contract_summary,
                    parent:contract_parents(contract_number)
                `)
                .eq('status', 'Completed')
                .order('updated_at', { ascending: false })

            if (error) throw error

            return data.map((d: any) => ({
                id: d.id,
                title: d.title,
                contract_number: d.parent?.contract_number || '-',
                appointed_vendor: d.appointed_vendor,
                effective_date: d.effective_date,
                expiry_date: d.expiry_date,
                contract_summary: d.contract_summary,
                version: d.version,
                parent_id: d.parent_id
            }))
        }
    })

    // Removed useEffect and fetchContracts

    const handleViewContract = (id: string) => {
        router.push(`/bid-agenda/${id}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Finished Contracts</h2>
                    <p className="text-muted-foreground">Archive of completed and finalized contracts</p>
                </div>
            </div>

            <div className="rounded-md border">
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
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading contracts...</TableCell>
                            </TableRow>
                        ) : contracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No finished contracts found
                                </TableCell>
                            </TableRow>
                        ) : contracts.map((contract) => (
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
                                    {contract.version > 1 ? (
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
            </div>
        </div>
    )
}
