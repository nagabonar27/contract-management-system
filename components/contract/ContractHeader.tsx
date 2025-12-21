import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Combobox, Option } from "@/components/ui/shared/combobox"
import { FilePenLine, FileCheck } from "lucide-react"

interface ContractHeaderProps {
    contract: {
        id: string
        title: string
        contract_number: string | null
        category: string | null
        division: string | null
        department: string | null
        expiry_date: string | null
        status: string
        current_step: string
        pt?: { name: string } | null
        contract_types?: { name: string } | null
        effective_date?: string | null
        vendor?: string | null
        vendor_2?: string | null
        vendor_3?: string | null
        appointed_vendor?: string | null
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
    }
    categoryOptions: Option[]
    ptOptions: Option[]
    typeOptions: Option[]
    onEditToggle: () => void
    onFormChange: (updates: Partial<ContractHeaderProps['editForm']>) => void
    onSave: () => void

    onFinish: () => void
    onAmend: () => void
    onExtend: () => void
    // Status checkboxes
    isCR?: boolean
    isOnHold?: boolean
    isAnticipated?: boolean
    onStatusChange?: (field: 'is_cr' | 'is_on_hold' | 'is_anticipated', value: boolean) => void
    hasAmendmentInProgress?: boolean
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
    isCR,
    isOnHold,
    isAnticipated,
    onStatusChange,
    hasAmendmentInProgress = false,
}: ContractHeaderProps) {
    const getBadgeVariant = () => {
        if (isActive) return 'default'
        if (displayStatus === 'Expired') return 'destructive'
        return 'secondary'
    }

    const getDivisionColor = (div: string | null) => {
        switch (div) {
            case 'TECH': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'HRGA': return 'bg-pink-100 text-pink-800 border-pink-200'
            case 'FIN': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'LGL': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'PROC': return 'bg-orange-100 text-orange-800 border-orange-200'
            case 'OPS': return 'bg-cyan-100 text-cyan-800 border-cyan-200'
            case 'EXT': return 'bg-lime-100 text-lime-800 border-lime-200'
            case 'PLNT': return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'MGMT': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const isAmendment = contract?.title?.toLowerCase().includes('amendment') || false

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 flex-wrap mb-2">
                        {contract?.title}

                        {/* Amendment Marker - Beside Contract Name */}
                        {isAmendment && (
                            <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200">
                                Amendment
                            </Badge>
                        )}

                        <Badge variant={getBadgeVariant()}>
                            {displayStatus}
                        </Badge>


                        {/* Status Markers */}
                        {isCR && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">CR</Badge>}
                        {isOnHold && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">On Hold</Badge>}
                        {isAnticipated && <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Anticipated</Badge>}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div>ID: {contract?.id}</div>
                        {contract?.contract_number && (
                            <div className="font-medium text-blue-600">
                                Contract #: {contract.contract_number}
                            </div>
                        )}
                        {contract?.expiry_date && (
                            <div>
                                Expires: {contract.expiry_date}
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
                                        <DropdownMenuItem onClick={onAmend}>
                                            Amend Contract
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onFinish}>
                                            Finish Contract
                                        </DropdownMenuItem>
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
                            <select
                                value={editForm.division}
                                onChange={e => onFormChange({ division: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select Division</option>
                                <option value="HRGA">HRGA</option>
                                <option value="TECH">TECH</option>
                                <option value="EXT">EXT</option>
                                <option value="OPS">OPS</option>
                                <option value="PROC">PROC</option>
                                <option value="LGL">LGL</option>
                                <option value="FIN">FIN</option>
                                <option value="PLNT">PLNT</option>
                                <option value="MGMT">MGMT</option>
                            </select>
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
                                    <Input
                                        type="date"
                                        value={editForm.effective_date}
                                        onChange={e => onFormChange({ effective_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Expiry Date</Label>
                                    <Input
                                        type="date"
                                        value={editForm.expiry_date}
                                        onChange={e => onFormChange({ expiry_date: e.target.value })}
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

                        <Button className="md:col-span-2" onClick={onSave}>
                            Save Changes
                        </Button>
                    </div>
                ) : (

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
                        <div>
                            <span className="block text-muted-foreground">Type</span>
                            <span className="font-medium">
                                {(() => {
                                    const types = contract?.contract_types as any
                                    return Array.isArray(types) ? (types[0]?.name || '-') : (types?.name || '-')
                                })()}
                            </span>
                        </div>
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
                        {(contract?.appointed_vendor || contract?.vendor || contract?.vendor_2 || contract?.vendor_3) && (
                            <div className="col-span-2">
                                <span className="block text-muted-foreground">Appointed Vendors</span>
                                <span className="font-medium">
                                    {contract.appointed_vendor || [contract.vendor, contract.vendor_2, contract.vendor_3].filter(Boolean).join(", ")}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
