"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, ChevronLeft, Plus, Loader2 } from "lucide-react"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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
    const supabase = createClientComponentClient()
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

    // --- DIVISION STATE ---
    const [selectedDivision, setSelectedDivision] = React.useState<string>("")

    const [typeOptions, setTypeOptions] = React.useState<any[]>([])

    // --- FETCH OPTIONS ---
    React.useEffect(() => {
        const fetchOptions = async () => {
            // Fetch PTs
            const { data: ptData } = await supabase.from('pt').select('id, name')
            if (ptData) {
                setPtOptions(ptData.map((pt: any) => ({ id: pt.id, label: pt.name, value: pt.name })))
            }

            // Fetch Contract Types
            const { data: typeData } = await supabase.from('contract_types').select('id, name')
            if (typeData) {
                setTypeOptions(typeData)
            }
        }
        fetchOptions()
    }, [])

    // --- HANDLERS ---
    const handleCreatePT = async () => {
        if (!searchPT) return
        const { data, error } = await supabase.from('pt').insert({ name: searchPT }).select().single()
        if (error) {
            alert("Error creating PT: " + error.message)
        } else if (data) {
            const newOption = { id: data.id, label: data.name, value: data.name }
            setPtOptions(prev => [...prev, newOption])
            setSelectedPT(newOption)
            setOpenPT(false)
        }
    }

    const handleCreateCategory = async () => {
        if (!searchCategory) return
        // Note: Category is just a string in contracts table, but we treat it as an option here
        const newOption = { label: searchCategory, value: searchCategory.toLowerCase().replace(/\s+/g, '_') }
        setCategoryOptions(prev => [...prev, newOption])
        setSelectedCategory(newOption)
        setOpenCategory(false)
    }

    // --- SUBMIT (Database Interactions) ---
    const handleSubmit = async () => {
        if (!contractName || !selectedPT || !selectedType || !selectedDivision) {
            alert("Please fill in all required fields.")
            return
        }

        setIsLoading(true)

        try {
            // ... (keep PT logic)
            let finalPtId = selectedPT.id
            if (!finalPtId) {
                // ...
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
                    division: selectedDivision,
                    status: 'On Progress',
                    current_step: '',
                    created_by: user?.id
                })

            if (contractError) throw contractError

            router.push('/contractmanagement/ongoing')

        } catch (error: any) {
            console.error("Error creating contract:", error)
            alert("Failed to create contract: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/contractmanagement/ongoing">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h2 className="text-2xl font-bold tracking-tight">Create New Contract</h2>
            </div>

            <div className="space-y-6">
                {/* Contract Title */}
                <div className="grid gap-2">
                    <Label>Contract Title</Label>
                    <Input
                        placeholder="e.g. Sewa Kendaraan 2024"
                        value={contractName}
                        onChange={(e) => setContractName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Contract Type */}
                    <div className="grid gap-2">
                        {/* ... (Type Select) */}
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

                    {/* Division Select */}
                    <div className="grid gap-2">
                        <Label htmlFor="division">Division</Label>
                        <Select onValueChange={setSelectedDivision} value={selectedDivision}>
                            <SelectTrigger id="division">
                                <SelectValue placeholder="Select Division" />
                            </SelectTrigger>
                            <SelectContent>
                                {["HRGA", "TECH", "EXT", "OPS", "PROC", "LGL", "FIN", "PLNT", "MGMT"].map((div) => (
                                    <SelectItem key={div} value={div}>
                                        {div}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* PT Name Combobox */}
                    <div className="grid gap-2 col-span-2">
                        <Label>PT Name</Label>
                        {/* ... (PT Popover) */}
                        <Popover open={openPT} onOpenChange={setOpenPT}>
                            {/* ... */}
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
                                                    // ...
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

            </div >
        </div >
    )
}

