import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    onFormChange: (updates: Partial<typeof editForm>) => void
    onSave: () => void
    onFinalize: () => void
    // Status checkboxes
    isCR?: boolean
    isOnHold?: boolean
    isAnticipated?: boolean
    onStatusChange?: (field: 'is_cr' | 'is_on_hold' | 'is_anticipated', value: boolean) => void
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
    onFinalize,
    isCR,
    isOnHold,
    isAnticipated,
    onStatusChange,
}: ContractHeaderProps) {
    const getBadgeVariant = () => {
        if (isActive) return 'default'
        if (displayStatus === 'Expired') return 'destructive'
        return 'secondary'
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 flex-wrap">
                        {contract?.title}
                        <Badge variant={getBadgeVariant()}>
                            {displayStatus}
                        </Badge>

                        {/* Status Markers */}
                        {isCR && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">CR</Badge>}
                        {isOnHold && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">On Hold</Badge>}
                        {isAnticipated && <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Anticipated</Badge>}
                    </CardTitle>
                    <CardDescription>ID: {contract?.id}</CardDescription>
                    {contract?.contract_number && (
                        <span className="mr-4 mt-1 text-sm font-medium text-blue-600">
                            Contract #: {contract.contract_number}
                        </span>
                    )}
                    {contract?.expiry_date && (
                        <span className="mt-1 text-sm text-muted-foreground">
                            Expires: {contract.expiry_date}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {isReadyToFinalize && !isActive && (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            onClick={onFinalize}
                        >
                            <FileCheck className="mr-2 h-4 w-4" /> Finalize Contract
                        </Button>
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
                            <span className="font-medium">{contract?.division || '-'}</span>
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
                        {(contract?.vendor || contract?.vendor_2 || contract?.vendor_3) && (
                            <div className="col-span-2">
                                <span className="block text-muted-foreground">Appointed Vendors</span>
                                <span className="font-medium">
                                    {[contract.vendor, contract.vendor_2, contract.vendor_3].filter(Boolean).join(", ")}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
