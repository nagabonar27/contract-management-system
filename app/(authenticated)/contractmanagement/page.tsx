"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ContractNav } from "@/components/contract/ContractNav"
import { OngoingContractsTable } from "@/components/contract/tables/OngoingContractsTable"
import { ActiveContractsTable } from "@/components/contract/tables/ActiveContractsTable"
import { ExpiringContractsTable } from "@/components/contract/tables/ExpiringContractsTable"
import { FinishedContractsTable } from "@/components/contract/tables/FinishedContractsTable"
import { ExpiredContractsTable } from "@/components/contract/tables/ExpiredContractsTable"



export default function ContractManagementPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')

    const [activeTab, setActiveTab] = useState(tabParam || "ongoing")

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        router.push(`/contractmanagement?tab=${tab}`)
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Contract Management</h1>

            <ContractNav activeTab={activeTab} onTabChange={handleTabChange} />

            <div className="mt-6">
                {activeTab === 'ongoing' && <OngoingContractsTable />}
                {activeTab === 'active' && <ActiveContractsTable />}
                {activeTab === 'expiring' && <ExpiringContractsTable />}
                {activeTab === 'expired' && <ExpiredContractsTable />}
                {activeTab === 'finished' && <FinishedContractsTable />}
            </div>
        </div>
    )
}
