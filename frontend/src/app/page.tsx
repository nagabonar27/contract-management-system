"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { FileText } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Determine where to send the user
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-slate-900 p-4 rounded-full animate-pulse">
            <FileText className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">ProcureFlow</h1>
        <p className="text-slate-500 mt-2">Loading system...</p>
      </div>
    </div>
  );
}
