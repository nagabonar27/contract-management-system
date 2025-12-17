"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, FileEdit, AlertTriangle } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { ContractNav } from "@/components/contract/ContractNav"

interface ExpiringContract {
    id: string
    title: string
    contract_number: string
    appointed_vendor: string | null
    effective_date: string | null
    expiry_date: string
    version: number
}

export default function ExpiringContractsPage() {
    const router = useRouter()
    const [contracts, setContracts] = useState<ExpiringContract[]>([])
    const [loading, setLoading] = useState(true)
    const [criticalCount, setCriticalCount] = useState(0)

    useEffect(() => {
        fetchExpiringContracts()
    }, [])

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
            alert('Failed to load contracts: ' + error.message)
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
        router.push(`/dashboard/contractmanagement/ongoing/${id}`)
    }

    const handleCreateAmendment = (id: string) => {
        router.push(`/contract-management/active/${id}/amend`)
    }

    const handleRenew = (id: string) => {
        router.push(`/contract-management/active/${id}/amend`)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Expiring Contracts</h1>
                <p className="text-muted-foreground">Contracts expiring within the next 90 days</p>
            </div>

            <ContractNav />

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
