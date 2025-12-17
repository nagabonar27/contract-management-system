import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// Contract Service - Core CRUD Operations
// ============================================

export interface Contract {
    id: string;
    contract_number?: string;
    title: string;
    vendor_id?: string;
    contract_type_id?: string;
    created_by?: string;
    status: string;
    current_step?: string;
    version?: number;
    parent_contract_id?: string;
    effective_date?: string;
    expiry_date?: string;
    category?: string;
    pt_id?: string;
    vendor_name?: string;
    user_department?: string;
    user_detail?: string;
    is_cr?: boolean;
    is_on_hold?: boolean;
    is_anticipated?: boolean;
    vendor_2?: string;
    vendor_3?: string;
    appointed_vendor?: string;
    appointed_vendor_2?: string;
    final_contract_amount?: number;
    cost_saving?: number;
    contract_summary?: string;
    reference_contract_number?: string;
    contract_batch_id?: string;
    batch_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ContractFilters {
    status?: string;
    pt_id?: string;
    category?: string;
    search?: string;
}

export class ContractService {
    /**
     * Get a single contract by ID with all related data
     */
    static async getContract(id: string): Promise<Contract | null> {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
          *,
          pt:pt_id(id, name, abbreviation),
          contract_type:contract_type_id(id, name),
          creator:created_by(id, email, full_name, position)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching contract:', error);
            throw error;
        }
    }

    /**
     * Get all contracts with optional filtering
     */
    static async getAllContracts(filters?: ContractFilters): Promise<Contract[]> {
        try {
            let query = supabase
                .from('contracts')
                .select(`
          *,
          pt:pt_id(id, name, abbreviation),
          contract_type:contract_type_id(id, name)
        `)
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.pt_id) {
                query = query.eq('pt_id', filters.pt_id);
            }
            if (filters?.category) {
                query = query.eq('category', filters.category);
            }
            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,contract_number.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching contracts:', error);
            throw error;
        }
    }

    /**
     * Get active contracts (status = 'Active')
     */
    static async getActiveContracts(): Promise<Contract[]> {
        return this.getAllContracts({ status: 'Active' });
    }

    /**
     * Get contracts expiring within specified days
     */
    static async getExpiringContracts(daysUntilExpiry: number = 120): Promise<Contract[]> {
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + daysUntilExpiry);

            const { data, error } = await supabase
                .from('contracts')
                .select(`
          *,
          pt:pt_id(id, name, abbreviation)
        `)
                .eq('status', 'Active')
                .gte('expiry_date', today.toISOString().split('T')[0])
                .lte('expiry_date', futureDate.toISOString().split('T')[0])
                .order('expiry_date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching expiring contracts:', error);
            throw error;
        }
    }

    /**
     * Create a new contract
     */
    static async createContract(contractData: Partial<Contract>): Promise<Contract> {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .insert([contractData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating contract:', error);
            throw error;
        }
    }

    /**
     * Update an existing contract
     */
    static async updateContract(id: string, updates: Partial<Contract>): Promise<Contract> {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating contract:', error);
            throw error;
        }
    }

    /**
     * Delete a contract and all related data (cascade)
     */
    static async deleteContract(id: string): Promise<void> {
        try {
            // Delete related records first
            await supabase.from('contract_bid_agenda').delete().eq('contract_id', id);
            await supabase.from('contract_vendors').delete().eq('contract_id', id);
            await supabase.from('contract_logs').delete().eq('contract_id', id);

            // Delete the contract
            const { error } = await supabase.from('contracts').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting contract:', error);
            throw error;
        }
    }

    /**
     * Create an amendment (copy of original contract)
     */
    static async createAmendment(originalContractId: string): Promise<Contract> {
        try {
            // Get original contract
            const original = await this.getContract(originalContractId);
            if (!original) throw new Error('Original contract not found');

            // Create new contract as amendment
            const amendmentData: Partial<Contract> = {
                ...original,
                id: undefined, // Let DB generate new ID
                parent_contract_id: original.id,
                version: (original.version || 0) + 1,
                status: 'On Progress',
                contract_number: undefined, // Will be filled at finalization
                reference_contract_number: undefined, // Will be filled at finalization
                created_at: undefined,
                updated_at: undefined,
            };

            return await this.createContract(amendmentData);
        } catch (error) {
            console.error('Error creating amendment:', error);
            throw error;
        }
    }

    /**
     * Get all versions of a contract (by contract_number or parent_contract_id)
     */
    static async getContractVersions(contractNumber: string): Promise<Contract[]> {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .or(`contract_number.eq.${contractNumber},reference_contract_number.eq.${contractNumber}`)
                .order('version', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching contract versions:', error);
            throw error;
        }
    }

    /**
     * Calculate cost saving for a contract
     */
    static async calculateCostSaving(contractId: string): Promise<number> {
        try {
            // Get appointed vendors
            const { data: vendors, error } = await supabase
                .from('contract_vendors')
                .select('price_note, revised_price_note')
                .eq('contract_id', contractId)
                .eq('is_appointed', true);

            if (error) throw error;
            if (!vendors || vendors.length === 0) return 0;

            // Calculate total savings
            let totalSaving = 0;
            for (const vendor of vendors) {
                const originalPrice = parseFloat(vendor.price_note || '0');
                const revisedPrice = parseFloat(vendor.revised_price_note || vendor.price_note || '0');
                totalSaving += (originalPrice - revisedPrice);
            }

            return totalSaving;
        } catch (error) {
            console.error('Error calculating cost saving:', error);
            return 0;
        }
    }

    /**
     * Get contracts in a batch
     */
    static async getContractBatch(batchId: string): Promise<Contract[]> {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('contract_batch_id', batchId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching contract batch:', error);
            throw error;
        }
    }
}
