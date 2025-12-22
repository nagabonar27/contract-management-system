"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FileEdit } from "lucide-react"

interface OriginalContract {
    id: string
    title: string
    contract_number: string
    category: string | null
    pt_id: number | null
    contract_type_id: number | null
    department: string | null
    appointed_vendor: string | null
    is_cr: boolean
    is_on_hold: boolean
    is_anticipated: boolean
    version: number
    effective_date: string | null
    expiry_date: string | null
    final_contract_amount: number | null
}

export default function AmendContractPage() {
    const router = useRouter()
    const params = useParams()
    const contractId = params?.id as string

    const [originalContract, setOriginalContract] = useState<OriginalContract | null>(null)
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    // Amendment form
    const [amendmentReason, setAmendmentReason] = useState("")
    const [amendmentType, setAmendmentType] = useState<"extension" | "value_modification" | "scope_change">("extension")
    const [newTitle, setNewTitle] = useState("")

    useEffect(() => {
        if (contractId) {
            fetchOriginalContract()
        }
    }, [contractId])

    const fetchOriginalContract = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', contractId)
                .single()

            if (error) throw error

            setOriginalContract(data)
            setNewTitle(data.title + " (Amendment)")
        } catch (error: any) {
            console.error('Error fetching contract:', error)
            alert('Failed to load contract: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAmendment = async () => {
        if (!originalContract) return
        if (!amendmentReason.trim()) {
            alert("Please provide an amendment reason")
            return
        }

        setCreating(true)
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            // Create new contract record (amendment)
            const newVersion = originalContract.version + 1

            const { data: newContract, error: contractError } = await supabase
                .from('contracts')
                .insert({
                    title: newTitle,
                    category: originalContract.category,
                    pt_id: originalContract.pt_id,
                    contract_type_id: originalContract.contract_type_id,
                    department: originalContract.department,
                    is_cr: originalContract.is_cr,
                    is_on_hold: originalContract.is_on_hold,
                    is_anticipated: originalContract.is_anticipated,
                    status: 'On Progress',
                    current_step: 'Amendment Processing',
                    version: newVersion,
                    parent_contract_id: contractId,
                    reference_contract_number: originalContract.contract_number,
                    created_by: user.id
                })
                .select()
                .single()

            if (contractError) throw contractError

            // Auto-populate vendors from original contract (without dates)
            const { data: originalVendors, error: vendorFetchError } = await supabase
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', contractId)

            if (vendorFetchError) throw vendorFetchError

            if (originalVendors && originalVendors.length > 0) {
                const newVendors = originalVendors.map(vendor => ({
                    contract_id: newContract.id,
                    vendor_name: vendor.vendor_name,
                    agenda_step_id: null, // Will be linked when user adds agenda steps
                    kyc_result: null, // Reset evaluation data
                    kyc_note: null,
                    tech_eval_score: null,
                    tech_eval_note: null,
                    tech_eval_remarks: null,
                    price_note: null,
                    revised_price_note: null
                }))

                const { error: vendorInsertError } = await supabase
                    .from('contract_vendors')
                    .insert(newVendors)

                if (vendorInsertError) throw vendorInsertError
            }

            // Note: No agenda copying - user starts with blank canvas

            // Create amendment detail record
            const { error: amendmentError } = await supabase
                .from('contract_amendments')
                .insert({
                    contract_id: newContract.id,
                    parent_contract_id: contractId,
                    amendment_version: newVersion,
                    amendment_type: amendmentType,
                    amendment_reason: amendmentReason,
                    previous_expiry_date: originalContract.expiry_date,
                    previous_amount: originalContract.final_contract_amount
                })

            if (amendmentError) {
                console.warn('Amendment detail record failed (table may not exist):', amendmentError)
                // Don't throw - this is optional
            }

            alert(`Amendment created successfully! Version ${newVersion}`)
            router.push(`/bid-agenda/${newContract.id}`)
        } catch (error: any) {
            console.error('Error creating amendment:', error)
            alert('Failed to create amendment: ' + error.message)
        } finally {
            setCreating(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center py-12">Loading contract...</div>
            </div>
        )
    }

    if (!originalContract) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center py-12 text-red-600">Contract not found</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create Amendment</h1>
                    <p className="text-muted-foreground">
                        Creating amendment for: <span className="font-medium">{originalContract.contract_number}</span>
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Original Contract Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Original Contract</CardTitle>
                        <CardDescription>Reference information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <span className="font-medium">Contract Number:</span> {originalContract.contract_number}
                        </div>
                        <div>
                            <span className="font-medium">Title:</span> {originalContract.title}
                        </div>
                        <div>
                            <span className="font-medium">Vendor:</span> {originalContract.appointed_vendor || 'Not set'}
                        </div>
                        <div>
                            <span className="font-medium">Effective Date:</span> {originalContract.effective_date || 'Not set'}
                        </div>
                        <div>
                            <span className="font-medium">Expiry Date:</span> {originalContract.expiry_date || 'Not set'}
                        </div>
                        <div>
                            <span className="font-medium">Contract Amount:</span> {originalContract.final_contract_amount ? `Rp ${originalContract.final_contract_amount.toLocaleString()}` : 'Not set'}
                        </div>
                        <div>
                            <span className="font-medium">Current Version:</span> v{originalContract.version}
                        </div>
                    </CardContent>
                </Card>

                {/* Amendment Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Amendment Details</CardTitle>
                        <CardDescription>New amendment will be version {originalContract.version + 1}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newTitle">Amendment Title</Label>
                            <Input
                                id="newTitle"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Contract title for amendment"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amendmentType">Amendment Type</Label>
                            <select
                                id="amendmentType"
                                value={amendmentType}
                                onChange={(e) => setAmendmentType(e.target.value as any)}
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            >
                                <option value="extension">Contract Extension</option>
                                <option value="value_modification">Value Modification</option>
                                <option value="scope_change">Scope Change</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amendmentReason">Amendment Reason *</Label>
                            <Textarea
                                id="amendmentReason"
                                value={amendmentReason}
                                onChange={(e) => setAmendmentReason(e.target.value)}
                                placeholder="Explain why this amendment is needed..."
                                rows={4}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <FileEdit className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-blue-900">What happens next?</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-800">
                                <li>A new contract record will be created (version {originalContract.version + 1})</li>
                                <li>You'll start with a blank canvas - no agenda steps</li>
                                <li>Vendors will be copied from original contract (evaluations reset)</li>
                                <li>Add your own agenda steps as needed</li>
                                <li>Status will be set to "On Progress"</li>
                                <li>You'll proceed through the same workflow as the original contract</li>
                                <li>Reference to original contract number will be maintained</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.back()} disabled={creating}>
                    Cancel
                </Button>
                <Button onClick={handleCreateAmendment} disabled={creating || !amendmentReason.trim()}>
                    {creating ? "Creating Amendment..." : "Create Amendment"}
                </Button>
            </div>
        </div>
    )
}
