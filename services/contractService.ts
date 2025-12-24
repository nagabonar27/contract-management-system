import { SupabaseClient } from '@supabase/supabase-js';

// No internal client creation - Must be injected

// ============================================
// Contract Service - Refactored for Split Arch
// ============================================

// The "View Model" that the UI expects (Flattened)
export interface Contract {
    id: string; // This is the VERSION ID
    parent_id?: string;
    // Fields from Parent
    contract_number?: string;
    created_by?: string;
    parent_created_at?: string;

    // Fields from Version
    version?: number;
    is_current?: boolean;
    title: string;
    status: string;
    current_step?: string;
    effective_date?: string;
    expiry_date?: string;
    final_contract_amount?: number;
    cost_saving?: number;
    contract_summary?: string;

    // Categorization
    category?: string;
    department?: string;
    division?: string;

    // Relationships
    contract_type_id?: number;
    pt_id?: number;
    appointed_vendor?: string;

    // Joined Data (for UI display)
    pt?: { id: number, name: string, abbreviation?: string };
    contract_types?: { id: number, name: string };
    profiles?: { full_name: string }; // Creator

    // Flags
    is_cr?: boolean;
    is_on_hold?: boolean;
    is_anticipated?: boolean;

    created_at?: string;
    updated_at?: string;

    // Legacy mapping helpers
    vendor_id?: string;
    parent_contract_id?: string; // Mapped to parent_id
}

export interface ContractFilters {
    status?: string;
    pt_id?: string;
    category?: string;
    search?: string;
}

export interface ContractLog {
    id: string;
    contract_id: string; // Version ID
    user_id: string;
    action: string;
    changes: any; // JSONB
    created_at: string;
}

export class ContractService {

    // --- HELPER: Flatten Query Result ---
    private static transformToContract(versionRow: any): Contract | null {
        if (!versionRow) return null;

        const parent = versionRow.parent || {};
        return {
            ...versionRow,
            contract_number: parent.contract_number,
            parent_created_at: parent.created_at,
            created_by: parent.created_by,
            pt: versionRow.pt,
            contract_types: versionRow.contract_type,
            profiles: parent.profiles,
            parent_contract_id: versionRow.parent_id
        };
    }

    /**
     * Get a single contract by ID (Version ID)
     */
    static async getContract(client: SupabaseClient, id: string): Promise<Contract | null> {
        try {
            // Join parent_id to get contract_number and creator
            // Note: profiles usually linked via Created By. 
            // In new schema, created_by is on Parent.
            const { data, error } = await client
                .from('contract_versions')
                .select(`
                    *,
                    parent:parent_id (
                        id, contract_number, created_at, created_by,
                        profiles:created_by (full_name, email, position)
                    ),
                    pt:pt_id (id, name, abbreviation),
                    contract_type:contract_type_id (id, name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return this.transformToContract(data);
        } catch (error) {
            console.error('Error fetching contract:', error);
            return null; // Don't throw to avoid crashing UI completely
        }
    }

    /**
     * Get all contracts
     */
    static async getAllContracts(client: SupabaseClient, filters?: ContractFilters): Promise<Contract[]> {
        try {
            let query = client
                .from('contract_versions')
                .select(`
                    *,
                    parent:parent_id (
                        id, contract_number, created_at, created_by,
                        profiles:created_by (full_name)
                    ),
                    pt:pt_id (id, name, abbreviation),
                    contract_type:contract_type_id (id, name)
                `)
                .eq('is_current', true)
                .order('updated_at', { ascending: false });

            if (filters?.status) query = query.eq('status', filters.status);
            if (filters?.pt_id) query = query.eq('pt_id', filters.pt_id);
            if (filters?.category) query = query.eq('category', filters.category);

            const { data, error } = await query;
            if (error) throw error;

            let result = (data || []).map(row => this.transformToContract(row)!);

            if (filters?.search) {
                const search = filters.search.toLowerCase();
                result = result.filter(c =>
                    c.title?.toLowerCase().includes(search) ||
                    c.contract_number?.toLowerCase().includes(search)
                );
            }

            return result;
        } catch (error) {
            console.error('Error fetching contracts:', error);
            throw error;
        }
    }

    /**
     * Create a new contract (Parent + Version 1)
     */
    static async createContract(client: SupabaseClient, contractData: Partial<Contract>): Promise<Contract> {
        try {
            // 1. Create Parent
            // Note: client (authenticated) must have Insert permission on contract_parents
            const { data: parentData, error: parentError } = await client
                .from('contract_parents')
                .insert({
                    contract_number: contractData.contract_number,
                    created_by: contractData.created_by
                })
                .select()
                .single();

            if (parentError) throw parentError;

            // 2. Create Version 1
            const versionPayload = {
                parent_id: parentData.id,
                version: 1,
                is_current: true,
                title: contractData.title,
                status: contractData.status || 'Draft',
                current_step: contractData.current_step || 'Drafting',
                category: contractData.category,
                division: contractData.division,
                department: contractData.department,
                pt_id: contractData.pt_id,
                contract_type_id: contractData.contract_type_id,
                effective_date: contractData.effective_date,
                expiry_date: contractData.expiry_date,
                is_cr: contractData.is_cr,
                is_on_hold: contractData.is_on_hold,
                is_anticipated: contractData.is_anticipated
            };

            const { data: versionData, error: versionError } = await client
                .from('contract_versions')
                .insert(versionPayload)
                .select()
                .single();

            if (versionError) throw versionError;

            // 3. No Default Agenda Seeding - User requested empty start
            // (Removed lines 213-235)

            await this.logChange(client, versionData.id, contractData.created_by || 'system', 'CREATE', versionPayload);

            return this.getContract(client, versionData.id) as Promise<Contract>;
        } catch (error) {
            console.error('Error creating contract:', error);
            throw error;
        }
    }

    /**
     * Update an existing contract
     */
    static async updateContract(client: SupabaseClient, id: string, updates: Partial<Contract>): Promise<Contract> {
        try {
            const { data: current } = await client.from('contract_versions').select('*').eq('id', id).single();
            if (!current) throw new Error("Contract not found");

            const { contract_number, ...versionUpdates } = updates;

            if (contract_number) {
                await client.from('contract_parents').update({ contract_number }).eq('id', current.parent_id);
            }

            const safeUpdates: any = {};
            const allowedFields = ['title', 'status', 'current_step', 'effective_date', 'expiry_date', 'final_contract_amount', 'cost_saving', 'contract_summary', 'category', 'department', 'division', 'pt_id', 'contract_type_id', 'appointed_vendor', 'is_cr', 'is_on_hold', 'is_anticipated'];

            Object.keys(versionUpdates).forEach(key => {
                // Allow known fields
                if (allowedFields.includes(key) && (versionUpdates as any)[key] !== undefined) {
                    safeUpdates[key] = (versionUpdates as any)[key];
                }
            });

            const { data, error } = await client
                .from('contract_versions')
                .update({ ...safeUpdates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await this.logChange(client, id, (updates as any).user_id || 'system', 'UPDATE', safeUpdates, current);

            return this.getContract(client, id) as Promise<Contract>;
        } catch (error) {
            console.error('Error updating contract:', error);
            throw error;
        }
    }

    /**
     * Log Changes
     */
    static async logChange(client: SupabaseClient, contractId: string, userId: string, action: string, newData: any, oldData: any = {}) {
        try {
            if (!userId || userId.length !== 36) return; // Basic UUID check

            const changes: any = {};

            if (action === 'CREATE') {
                changes['initial_state'] = newData;
            } else {
                Object.keys(newData).forEach(key => {
                    if (key === 'updated_at') return;
                    if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
                        changes[key] = {
                            old: oldData[key],
                            new: newData[key]
                        };
                    }
                });
            }

            if (Object.keys(changes).length === 0 && action !== 'CREATE') return;

            await client.from('contract_logs').insert({
                contract_id: contractId,
                user_id: userId,
                action,
                changes
            });
        } catch (err) {
            console.error("Audit Log Failed:", err);
        }
    }

    /**
     * createAmendment
     */
    static async createAmendment(client: SupabaseClient, originalContractId: string, userId?: string): Promise<Contract> {
        try {
            const original = await this.getContract(client, originalContractId);
            if (!original) throw new Error('Original contract not found');

            const newVersionNum = (original.version || 0) + 1;

            const newVersionData = {
                parent_id: original.parent_id, // Same parent as original
                version: newVersionNum,
                is_current: true,

                title: `${original.title} - Amendment ${newVersionNum}`,
                status: 'On Progress',
                current_step: 'Initiated',

                category: original.category,
                division: original.division,
                department: original.department,
                contract_type_id: original.contract_type_id,
                pt_id: original.pt_id,

                effective_date: original.effective_date,
                expiry_date: original.expiry_date,
                contract_summary: `Amendment of ${original.contract_number}`,
            };

            const { data, error } = await client
                .from('contract_versions')
                .insert(newVersionData)
                .select()
                .single();

            if (error) throw error;

            await this.logChange(client, data.id, userId || 'system', 'CREATE_AMENDMENT', newVersionData);

            return this.getContract(client, data.id) as Promise<Contract>;
        } catch (error) {
            console.error('Error creating amendment:', error);
            throw error;
        }
    }

    static async deleteContract(client: SupabaseClient, id: string): Promise<void> {
        // 1. Get Parent ID before deleting
        const { data: version } = await client
            .from('contract_versions')
            .select('parent_id')
            .eq('id', id)
            .single();

        if (!version) return; // Already gone

        // 2. Delete Version (Cascades to Agenda, Vendors, etc.)
        const { error: deleteError } = await client
            .from('contract_versions')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // 3. Cleanup Parent if no versions left
        // Check if other versions exist
        const { count } = await client
            .from('contract_versions')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', version.parent_id);

        if (count === 0) {
            await client.from('contract_parents').delete().eq('id', version.parent_id);
        }
    }

    static async getActiveContracts(client: SupabaseClient): Promise<Contract[]> {
        return this.getAllContracts(client, { status: 'Active' });
    }

    static async calculateCostSaving(client: SupabaseClient, contractId: string): Promise<number> {
        const { data: vendors, error } = await client
            .from('contract_vendors')
            .select('price_note, revised_price_note')
            .eq('contract_id', contractId)
            .eq('is_appointed', true);

        if (error) throw error;
        if (!vendors || vendors.length === 0) return 0;

        let totalSaving = 0;
        for (const vendor of vendors) {
            const originalPrice = parseFloat(vendor.price_note || '0');
            const revisedPrice = parseFloat(vendor.revised_price_note || vendor.price_note || '0');
            totalSaving += (originalPrice - revisedPrice);
        }
        return totalSaving;
    }
}
