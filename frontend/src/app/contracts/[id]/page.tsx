"use client"

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api, { endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Edit, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Log {
    log_id: number;
    step_name: string;
    status_date: string;
    remarks: string;
}

interface Step {
    step_id: number;
    step_name: string;
    step_order: number;
}

interface ContractDetail {
    id: number;
    contract_name: string;
    contract_type: string;
    step_name: string;
    current_step_id: number;
    is_active_process: number;
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [contract, setContract] = useState<ContractDetail | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);

    // Forms State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('');

    const [stepId, setStepId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [customDate, setCustomDate] = useState('');

    const [finalNumber, setFinalNumber] = useState('');
    const [finalDate, setFinalDate] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await api.get(`${endpoints.contracts}/${id}`);
            setContract(res.data.contract);
            setLogs(res.data.logs);
            setSteps(res.data.steps);

            // Init form values
            setNewName(res.data.contract.contract_name);
            setNewType(res.data.contract.contract_type);
        } catch (error) {
            console.error("Failed to fetch contract", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDetails = async () => {
        try {
            await api.put(`${endpoints.contracts}/${id}/update`, {
                contract_name: newName,
                contract_type: newType,
            });
            fetchData(); // Refresh
        } catch (error) {
            console.error("Update failed", error);
        }
    };

    const handleLogStep = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`${endpoints.contracts}/${id}/log`, {
                step_id: stepId,
                remarks: remarks,
                custom_date: customDate
            });
            // specific refresh or clear form
            setRemarks('');
            setCustomDate('');
            fetchData();
        } catch (error) {
            console.error("Log failed", error);
        }
    };

    const handleFinalize = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`${endpoints.contracts}/${id}/finalize`, {
                contract_number: finalNumber,
                effective_date: finalDate
            });
            router.push('/active');
        } catch (error) {
            console.error("Finalize failed", error);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading contract details...</div>;
    if (!contract) return <div className="p-10 text-center text-red-500">Contract not found</div>;

    const isCompleted = contract.step_name === 'Completed';

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <Link href="/dashboard" className="text-blue-600 hover:underline flex items-center text-sm">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">

                    {/* Header / Settings Card */}
                    <Card className={`border-l-4 ${isCompleted ? 'border-green-500' : 'border-blue-500'}`}>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl">{contract.contract_name}</CardTitle>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Type: {contract.contract_type} | ID: #{contract.id}
                                </div>
                            </div>
                            <Badge className={isCompleted ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-blue-100 text-blue-800 hover:bg-blue-100'}>
                                {contract.step_name}
                            </Badge>
                        </CardHeader>
                        {!isCompleted && (
                            <CardContent className="bg-slate-50/50 p-4 border-t">
                                <div className="text-sm font-bold text-muted-foreground uppercase mb-2">Update Settings</div>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Name</Label>
                                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 bg-white" />
                                    </div>
                                    <div className="w-[200px]">
                                        <Label className="text-xs">Type</Label>
                                        <Select value={newType} onValueChange={setNewType}>
                                            <SelectTrigger className="h-8 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pending">Pending / TBD</SelectItem>
                                                <SelectItem value="Direct Selection">Direct Selection</SelectItem>
                                                <SelectItem value="Direct Appointment">Direct Appointment</SelectItem>
                                                <SelectItem value="Amendment">Amendment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={handleUpdateDetails} className="h-8">Save</Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Action Area */}
                    {!isCompleted ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Edit className="h-4 w-4 text-blue-500" /> Log New Process Step
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogStep} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <Label>New Status</Label>
                                            <Select onValueChange={setStepId} required>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Step..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {steps.map(s => (
                                                        <SelectItem key={s.step_id} value={s.step_id.toString()}>
                                                            {s.step_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1">
                                            <Label>Date of Action</Label>
                                            <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Remarks</Label>
                                        <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Document received" />
                                    </div>
                                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Update Status</Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-green-50 border-green-200">
                            <CardHeader>
                                <CardTitle className="text-green-800">Ready to Finalize</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleFinalize} className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1">
                                        <Label className="text-green-800">Legal Contract No.</Label>
                                        <Input className="bg-white" value={finalNumber} onChange={e => setFinalNumber(e.target.value)} required placeholder="LGL-202X-001" />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-green-800">Effective Date</Label>
                                        <Input type="date" className="bg-white" value={finalDate} onChange={e => setFinalDate(e.target.value)} required />
                                    </div>
                                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Activate</Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* History Sidebar */}
                <div>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Process History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pl-6 py-2">
                                {logs.map((log) => (
                                    <div key={log.log_id} className="relative">
                                        <span className="absolute -left-[31px] top-1 bg-white border-2 border-blue-400 rounded-full w-4 h-4"></span>
                                        <div className="font-bold text-sm">{log.step_name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center mb-1">
                                            <Calendar className="mr-1 h-3 w-3" /> {log.status_date}
                                        </div>
                                        {log.remarks && (
                                            <div className="text-sm bg-slate-50 p-2 rounded border text-slate-600">
                                                {log.remarks}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {logs.length === 0 && <div className="text-sm text-slate-400 italic">No history yet.</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
