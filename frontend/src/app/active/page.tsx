"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';

interface ActiveContract {
    contract_id: number;
    contract_number: string;
    contract_type: string;
    contract_version: number;
    contract_name: string;
    effective_date: string;
    master_id: number;
}

export default function RepositoryPage() {
    const router = useRouter();
    const [contracts, setContracts] = useState<ActiveContract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActive();
    }, []);

    const fetchActive = async () => {
        try {
            const res = await api.get(endpoints.active);
            setContracts(res.data);
        } catch (error) {
            console.error("Failed to fetch active repository", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAmend = async (id: number) => {
        if (!confirm('Start a new AMENDMENT process for this contract?')) return;

        try {
            const res = await api.post(`${endpoints.active}/${id}/amend`);
            router.push(`/contracts/${res.data.id}`);
        } catch (error) {
            console.error("Failed to start amendment", error);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Repository...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Active Contract Repository</CardTitle>
                    <CardDescription>Legal library of finalized and active contracts</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Contract No</TableHead>
                                <TableHead>PT Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Ver</TableHead>
                                <TableHead>Contract Name</TableHead>
                                <TableHead>Effective Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.map((c) => (
                                <TableRow key={c.contract_id} className="hover:bg-yellow-50/30">
                                    <TableCell className="font-mono text-slate-600">{c.contract_number}</TableCell>
                                    <TableCell>{c.master_id}</TableCell>
                                    <TableCell>
                                        <Badge variant={c.contract_type === 'Amendment' ? 'secondary' : 'default'} className={c.contract_type !== 'Amendment' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-none' : ''}>
                                            {c.contract_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">v.{c.contract_version}</span>
                                    </TableCell>
                                    <TableCell className="font-medium">{c.contract_name}</TableCell>
                                    <TableCell>{c.effective_date}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-orange-700 border-orange-200 hover:bg-orange-50"
                                            onClick={() => handleAmend(c.contract_id)}
                                        >
                                            <Edit className="mr-1 h-3 w-3" /> Amend
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {contracts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No active contracts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
