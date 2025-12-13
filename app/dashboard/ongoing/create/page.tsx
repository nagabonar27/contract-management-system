"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, ChevronLeft, Plus, Loader2 } from "lucide-react"

import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// Type definition: We use 'id' (number) for the database ID
type Option = { id?: number; label: string; value: string }

export default function CreateContractPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(false)

    // --- FORM STATE ---
    const [contractName, setContractName] = React.useState("")
    const [selectedType, setSelectedType] = React.useState("")

    // --- PT STATE ---
    const [openPT, setOpenPT] = React.useState(false)
    const [ptOptions, setPtOptions] = React.useState<Option[]>([])
    const [selectedPT, setSelectedPT] = React.useState<Option | null>(null)
    const [searchPT, setSearchPT] = React.useState("")

    // --- CATEGORY STATE ---
    const [openCategory, setOpenCategory] = React.useState(false)
    const [categoryOptions, setCategoryOptions] = React.useState<Option[]>([
        { label: "Rent", value: "rent" },
        { label: "Consignment", value: "consignment" },
        { label: "Layanan Kesehatan", value: "layanan_kesehatan" },
        { label: "Rehab DAS", value: "rehab_das" },
        { label: "Pengeboran Inti", value: "pengeboran_inti" },
        { label: "Jasa Logistik", value: "jasa_logistik" },
    ])
    const [selectedCategory, setSelectedCategory] = React.useState<Option | null>(null)
    const [searchCategory, setSearchCategory] = React.useState("")

    const [typeOptions, setTypeOptions] = React.useState<any[]>([])

    // --- LOAD DATA ---
    React.useEffect(() => {
        const loadData = async () => {
            // 1. Fetch PTs
            const { data: pts } = await supabase.from('pt').select('*')
            if (pts) {
                // Map the DB 'id' to our option 'id'
                setPtOptions(pts.map(p => ({
                    id: p.id,
                    label: p.name,
                    value: p.name.toLowerCase()
                })))
            }

            // 2. Fetch Types
            const { data: types } = await supabase.from('contract_types').select('*')
            if (types) {
                setTypeOptions(types)
            }
        }
        loadData()
    }, [])

    // --- HANDLERS (Local State Only) ---
    const handleCreatePT = () => {
        if (!searchPT) return
        // We don't have an ID yet, so 'id' is undefined
        const newOption = { label: searchPT, value: searchPT.toLowerCase() }
        setPtOptions(prev => [...prev, newOption])
        setSelectedPT(newOption)
        setOpenPT(false)
    }

    const handleCreateCategory = () => {
        if (!searchCategory) return
        const newOption = { label: searchCategory, value: searchCategory.toLowerCase() }
        setCategoryOptions(prev => [...prev, newOption])
        setSelectedCategory(newOption)
        setOpenCategory(false)
    }

    // --- SUBMIT (Database Interactions) ---
    const handleSubmit = async () => {
        if (!contractName || !selectedPT || !selectedType) {
            alert("Please fill in all required fields.")
            return
        }

        setIsLoading(true)

        try {
            // A. Handle PT (Insert if new)
            let finalPtId = selectedPT.id // This is the simple 'id' from the pt table

            if (!finalPtId) {
                // If ID is missing, it means user typed a new PT. Create it now.
                const { data: newPt, error: ptError } = await supabase
                    .from('pt')
                    .insert({ name: selectedPT.label })
                    .select() // This returns the new row with its 'id'
                    .single()

                if (ptError) throw ptError
                finalPtId = newPt.id // Capture the new simple 'id'
            }

            // B. Get User
            const { data: { user } } = await supabase.auth.getUser()

            // C. Insert Contract
            const { error: contractError } = await supabase
                .from('contracts')
                .insert({
                    title: contractName,
                    pt_id: finalPtId,
                    contract_type_id: parseInt(selectedType),
                    category: selectedCategory?.label || null,
                    status: 'On Progress',
                    current_step: '',
                    created_by: user?.id
                })

            if (contractError) throw contractError

            router.push('/dashboard/ongoing')

        } catch (error: any) {
            console.error("Error creating contract:", error)
            alert("Failed to create contract: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
                    <Link href="/dashboard/ongoing">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>

            <div className="mx-auto max-w-2xl space-y-6 border rounded-lg p-6 bg-card shadow-sm">
                <div className="space-y-2 text-center sm:text-left">
                    <h3 className="text-lg font-medium">Create New Request</h3>
                    <p className="text-sm text-muted-foreground">
                        Enter the details for the new ongoing contract.
                    </p>
                </div>

                <div className="grid gap-4">
                    {/* Contract Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">Contract Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Kontrak Pengeboran"
                            value={contractName}
                            onChange={(e) => setContractName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Contract Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="type">Contract Type</Label>
                            <Select onValueChange={setSelectedType} value={selectedType}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map((type) => (
                                        <SelectItem key={type.id} value={type.id.toString()}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* PT Name Combobox */}
                        <div className="grid gap-2">
                            <Label>PT Name</Label>
                            <Popover open={openPT} onOpenChange={setOpenPT}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between font-normal"
                                    >
                                        {selectedPT ? selectedPT.label : "Select or create PT..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search PT..." onValueChange={setSearchPT} />
                                        <CommandList>
                                            <CommandEmpty className="p-2">
                                                <p className="text-sm text-muted-foreground mb-2">No PT found.</p>
                                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={handleCreatePT}>
                                                    <Plus className="mr-2 h-3 w-3" /> Create "{searchPT}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {ptOptions.map((option) => (
                                                    <CommandItem
                                                        key={option.value}
                                                        value={option.label}
                                                        onSelect={() => {
                                                            setSelectedPT(option)
                                                            setOpenPT(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedPT?.value === option.value ? "opacity-100" : "opacity-0")} />
                                                        {option.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Category Combobox */}
                    <div className="grid gap-2">
                        <Label>Category</Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal"
                                >
                                    {selectedCategory ? selectedCategory.label : "Select or create category..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search category..." onValueChange={setSearchCategory} />
                                    <CommandList>
                                        <CommandEmpty className="p-2">
                                            <p className="text-sm text-muted-foreground mb-2">No category found.</p>
                                            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={handleCreateCategory}>
                                                <Plus className="mr-2 h-3 w-3" /> Create "{searchCategory}"
                                            </Button>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {categoryOptions.map((option) => (
                                                <CommandItem
                                                    key={option.value}
                                                    value={option.label}
                                                    onSelect={() => {
                                                        setSelectedCategory(option)
                                                        setOpenCategory(false)
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedCategory?.value === option.value ? "opacity-100" : "opacity-0")} />
                                                    {option.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        className="w-full mt-4 bg-green-600 hover:bg-green-700"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Create Request"
                        )}
                    </Button>

                </div>
            </div>
        </div>
    )
}

