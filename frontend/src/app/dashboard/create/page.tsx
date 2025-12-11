"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { endpoints } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateContractPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [type, setType] = useState('To Be Determined');
    const [pt, setPt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(endpoints.contracts, {
                contract_name: name,
                contract_type: type,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to create contract", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link href="/dashboard" className="text-blue-600 hover:underline flex items-center text-sm">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Request</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="name">Contract Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Kontrak Pengeboran"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="type">Contract Type</Label>
                                <Select
                                    value={type}
                                    onValueChange={setType}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select contract type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="To Be Determined">To Be Determined</SelectItem>
                                        <SelectItem value="Direct Selection">Direct Selection</SelectItem>
                                        <SelectItem value="Direct Appointment">Direct Appointment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label>PT Name</Label>
                                <Select value={pt} onValueChange={setPt}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select PT" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PT Mineral Alam Abadi">PT Mineral Alam Abadi</SelectItem>
                                        <SelectItem value="PT Karya Tambang Sentosa">PT Karya Tambang Sentosa</SelectItem>
                                        <SelectItem value="PT Mitra Mineral Perkasa">PT Mitra Mineral Perkasa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Request'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
