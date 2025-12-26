import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Combobox, Option } from "@/components/ui/shared/combobox"
import { FilePenLine, FileCheck } from "lucide-react"
import { getDivisionColor } from "@/lib/contractUtils"
import { ContractBadges } from "@/components/contract/ui/ContractBadges"
import { ContractStatusBadge } from "@/components/contract/ui/ContractStatusBadge"
import { DatePicker } from "@/components/DatePicker"
import { format, parseISO } from "date-fns"

interface ContractHeaderProps {
    contract: {
        id: string
        title: string
        contract_number: string | null
        category: string | null
        division: string | null
        department: string | null
        expiry_date: string | null
        version?: number
        status: string
        current_step: string
        pt?: { name: string } | null
        contract_types?: { name: string } | null
        parent_contract_id?: string | null
        effective_date?: string | null
        vendor?: string | null
        vendor_2?: string | null
        vendor_3?: string | null
        appointed_vendor?: string | null
        createdBy?: string | null
        created_at?: string | null
    } | null
    displayStatus: string
    isActive: boolean
    isReadyToFinalize: boolean
    isEditingHeader: boolean
    editForm: {
        title: string
        category: string
        division: string
        department: string
        pt_name: string
        contract_type_name: string
        effective_date: string
        expiry_date: string
        created_by?: string
        created_at?: string
    }
    categoryOptions: Option[]


    ptOptions: Option[]
    typeOptions: Option[]
    userOptions?: Option[]
    userPosition?: string | null
    onEditToggle: () => void
    onFormChange: (updates: Partial<ContractHeaderProps['editForm']>) => void
    onSave: () => void

    onFinish: () => void
    onAmend: () => void
    onExtend: () => void
    onRevert?: () => void
    // Status checkboxes
    isCR?: boolean
    isOnHold?: boolean
    isAnticipated?: boolean
    onStatusChange?: (field: 'is_cr' | 'is_on_hold' | 'is_anticipated', value: boolean) => void
    hasAmendmentInProgress?: boolean
    appointedVendorName?: string | null
}

export function ContractHeader({
    contract,
    displayStatus,
    isActive,
    isReadyToFinalize,
    isEditingHeader,
    editForm,
    categoryOptions,
    ptOptions,
    typeOptions,
    onEditToggle,
    onFormChange,
    onSave,
    onFinish,
    onAmend,
    onExtend,
    onRevert,
    isCR,
    isOnHold,
    isAnticipated,
    onStatusChange,
    hasAmendmentInProgress = false,
    userOptions = [],
    userPosition = null,
    appointedVendorName
}: ContractHeaderProps) {
    /* getDivisionColor now imported from @/lib/contractUtils */

    // Logic: Amendment if version > 1 OR explicit type/title
    const isAmendment = (contract?.version || 1) > 1 ||
        contract?.contract_types?.name?.toLowerCase().includes('amendment') ||
        contract?.title?.toLowerCase().includes('amendment') ||
        false

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">



                    <CardTitle className="flex items-center gap-3 flex-wrap mb-2">
                        {contract?.title}

                        <ContractBadges
                            isAmendment={isAmendment}
                            isCR={isCR}
                            isOnHold={isOnHold}
                            isAnticipated={isAnticipated}
                        />

                        <ContractStatusBadge status={displayStatus} />
                    </CardTitle>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex gap-4">
                            <span>ID: {contract?.id}</span>
                            {contract?.createdBy && (
                                <span className="text-gray-500">• Created by <span className="font-medium text-gray-700">{contract.createdBy}</span></span>
                            )}
                        </div>
                        {contract?.contract_number && (
                            <div className="font-medium text-blue-600">
                                Contract #: {contract.contract_number}
                            </div>
                        )}
                        {contract?.created_at && (
                            <div>
                                Created: {new Date(contract.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {isActive && (
                        <>
                            {!hasAmendmentInProgress && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                                            <FileCheck className="mr-2 h-4 w-4" /> Take Action
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {(displayStatus === 'Active' || displayStatus === 'Expired') && (
                                            <>
                                                <DropdownMenuItem onClick={onAmend}>
                                                    Amend Contract
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={onFinish}>
                                                    Finish Contract
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {onRevert && (
                                            <>
                                                {(displayStatus === 'Active' || displayStatus === 'Expired') && <DropdownMenuSeparator />}
                                                <DropdownMenuItem onClick={onRevert} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                    Revert to Progress
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </>
                    )}
                    {displayStatus === 'Expired' && !isActive && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onExtend}
                        >
                            Extend Contract
                        </Button>
                    )}

                    {isReadyToFinalize && !isActive && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                                    <FileCheck className="mr-2 h-4 w-4" /> Take Action
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onFinish}>
                                    Finish Contract
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button
                        variant={isEditingHeader ? "secondary" : "outline"}
                        size="sm"
                        onClick={onEditToggle}
                    >
                        {isEditingHeader ? "Cancel" : (
                            <>
                                <FilePenLine className="mr-2 h-4 w-4" /> Edit Details
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isEditingHeader ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Contract Name</Label>
                            <Input
                                value={editForm.title}
                                onChange={e => onFormChange({ title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Contract Type</Label>
                            <Combobox
                                options={typeOptions}
                                value={editForm.contract_type_name}
                                onSelect={val => onFormChange({ contract_type_name: val })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <Combobox
                                options={categoryOptions}
                                value={editForm.category}
                                onSelect={val => onFormChange({ category: val })}
                                allowCreate
                                onCreate={val => onFormChange({ category: val })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Division</Label>
                            <Combobox
                                options={[
                                    { label: "HRGA", value: "HRGA" },
                                    { label: "TECH", value: "TECH" },
                                    { label: "EXT", value: "EXT" },
                                    { label: "OPS", value: "OPS" },
                                    { label: "PROC", value: "PROC" },
                                    { label: "LGL", value: "LGL" },
                                    { label: "FIN", value: "FIN" },
                                    { label: "PLNT", value: "PLNT" },
                                    { label: "MGMT", value: "MGMT" },
                                ]}
                                value={editForm.division}
                                onSelect={val => onFormChange({ division: val })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Department</Label>
                            <Input
                                value={editForm.department}
                                onChange={e => onFormChange({ department: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>PT</Label>
                            <Combobox
                                options={ptOptions}
                                value={editForm.pt_name}
                                onSelect={val => onFormChange({ pt_name: val })}
                            />
                        </div>

                        {/* Dates are editable if contract is active */}
                        {isActive && (
                            <>
                                <div className="grid gap-2">
                                    <Label>Effective Date</Label>
                                    <DatePicker
                                        value={editForm.effective_date ? parseISO(editForm.effective_date) : undefined}
                                        onChange={(date) => onFormChange({ effective_date: date ? format(date, 'yyyy-MM-dd') : "" })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Expiry Date</Label>
                                    <DatePicker
                                        value={editForm.expiry_date ? parseISO(editForm.expiry_date) : undefined}
                                        onChange={(date) => onFormChange({ expiry_date: date ? format(date, 'yyyy-MM-dd') : "" })}
                                        className="w-full"
                                    />
                                </div>
                            </>
                        )}

                        {/* Status Checkboxes */}
                        {onStatusChange && (
                            <div className="md:col-span-2 grid gap-3">
                                <Label>Status Markers</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isCR || false}
                                            onChange={e => onStatusChange('is_cr', e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">CR (Contract Requisition)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isOnHold || false}
                                            onChange={e => onStatusChange('is_on_hold', e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">On Hold</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAnticipated || false}
                                            onChange={e => onStatusChange('is_anticipated', e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm">Anticipated</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Admin Access Section */}
                        {(userPosition === 'admin' || userPosition === 'Data & System Analyst') && (
                            <div className="md:col-span-2 border-t pt-4 mt-2">
                                <h4 className="text-sm font-medium mb-4 text-gray-900 flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">Admin Access</span>
                                </h4>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Created By (Override)</Label>
                                        <Combobox
                                            options={userOptions}
                                            value={userOptions.find(u => u.value === editForm.created_by)?.label || editForm.created_by || ""}
                                            onSelect={val => onFormChange({ created_by: val })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Contract Created Date</Label>
                                        <DatePicker
                                            value={editForm.created_at ? parseISO(editForm.created_at) : undefined}
                                            onChange={(date) => onFormChange({ created_at: date ? format(date, 'yyyy-MM-dd') : "" })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button className="md:col-span-2" onClick={onSave}>
                            Save Changes
                        </Button>
                    </div>
                ) : (

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                        <div>
                            <span className="block text-muted-foreground">Category</span>
                            <span className="font-medium">{contract?.category || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Division</span>
                            <span className="font-medium">
                                {contract?.division ? (
                                    <Badge variant="outline" className={getDivisionColor(contract.division)}>
                                        {contract.division}
                                    </Badge>
                                ) : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Department</span>
                            <span className="font-medium">{contract?.department || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">PT</span>
                            <span className="font-medium">
                                {(() => {
                                    const pt = contract?.pt as any
                                    return Array.isArray(pt) ? (pt[0]?.name || '-') : (pt?.name || '-')
                                })()}
                            </span>
                        </div>
                        <div>
                            <span className="block text-muted-foreground">Current Step</span>
                            <span className="font-medium">{contract?.current_step || '-'}</span>
                        </div>
                        {isActive && contract?.effective_date && (
                            <div>
                                <span className="block text-muted-foreground">Effective Date</span>
                                <span className="font-medium">{contract.effective_date}</span>
                            </div>
                        )}
                        {isActive && contract?.expiry_date && (
                            <div>
                                <span className="block text-muted-foreground">Expiry Date</span>
                                <span className="font-medium">{contract.expiry_date}</span>
                            </div>
                        )}
                        {(appointedVendorName || [contract?.vendor, contract?.vendor_2, contract?.vendor_3].filter(Boolean).length > 0) && (
                            <div className="col-span-2">
                                <span className="block text-muted-foreground">Appointed Vendor</span>
                                <span className="font-medium">
                                    {appointedVendorName || [contract?.vendor, contract?.vendor_2, contract?.vendor_3].filter(Boolean).join(", ")}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
