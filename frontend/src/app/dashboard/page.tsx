"use client"

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface Stat {
    step_name: string;
    count: number;
}

interface OngoingContract {
    id: number;
    contract_name: string;
    contract_type: string;
    step_name: string;
    is_active_process: number;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stat[]>([]);
    const [ongoing, setOngoing] = useState<OngoingContract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(endpoints.dashboard);
                setStats(res.data.stats);
                setOngoing(res.data.ongoing);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="text-center p-10">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.name}</p>
                </div>
                <Link href="/dashboard/create">
                    <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="mr-2 h-4 w-4" /> New Request
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.step_name} className="bg-blue-50 border-blue-100 shadow-sm text-center">
                        <CardHeader className="p-4">
                            <CardTitle className="text-3xl text-blue-600 font-bold">{stat.count}</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase text-slate-500 mt-1">
                                {stat.step_name}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
                {stats.length === 0 && (
                    <div className="col-span-full text-center p-4 text-muted-foreground text-sm italic">
                        No active process stats available.
                    </div>
                )}
            </div>

            {/* Ongoing Processes Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Ongoing Processes</CardTitle>
                    <CardDescription>Contracts currently in workflow</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Contract Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Current Step</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ongoing.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">#{item.id}</TableCell>
                                    <TableCell>{item.contract_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.contract_type === 'Amendment' ? 'secondary' : 'outline'}>
                                            {item.contract_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-blue-600 font-medium">{item.step_name}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/contracts/${item.id}`}>
                                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-900">
                                                Process <ArrowRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {ongoing.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No ongoing contracts found.
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
