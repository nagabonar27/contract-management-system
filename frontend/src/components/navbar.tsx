"use client"

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { FileText, User } from 'lucide-react';

export function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();

    if (!isAuthenticated) return null;

    return (
        <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/dashboard" className="text-xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    ProcureFlow
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-white hover:text-white hover:bg-slate-700">
                            Dashboard
                        </Button>
                    </Link>
                    <Link href="/active">
                        <Button variant="ghost" className="text-white hover:text-white hover:bg-slate-700">
                            Repository
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <User className="h-4 w-4" />
                        {user?.name}
                    </div>
                    <Button variant="destructive" size="sm" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </div>
        </nav>
    );
}
