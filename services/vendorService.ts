import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Vendor Service - Vendor Evaluation Operations
// ============================================

export interface VendorEvaluation {
    id: string;
    contract_id: string;
    vendor_name: string;
    kyc_note?: string;
    kyc_result?: string;
    tech_eval_score?: number;
    tech_eval_remarks?: string;
    price_note?: string;
    revised_price_note?: string;
    is_appointed?: boolean;
    created_at?: string;
}

export class VendorService {
    /**
     * Get all vendor evaluations for a contract
     */
    static async getContractVendors(client: SupabaseClient, contractId: string): Promise<VendorEvaluation[]> {
        try {
            const { data, error } = await client
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', contractId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching vendors:', error);
            throw error;
        }
    }

    /**
     * Create a new vendor evaluation
     */
    static async createVendorEvaluation(client: SupabaseClient, vendorData: Omit<VendorEvaluation, 'id' | 'created_at'>): Promise<VendorEvaluation> {
        try {
            const { data, error } = await client
                .from('contract_vendors')
                .insert([vendorData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating vendor evaluation:', error);
            throw error;
        }
    }

    /**
     * Update a vendor evaluation
     */
    static async updateVendorEvaluation(client: SupabaseClient, id: string, updates: Partial<VendorEvaluation>): Promise<VendorEvaluation> {
        try {
            const { data, error } = await client
                .from('contract_vendors')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating vendor evaluation:', error);
            throw error;
        }
    }

    /**
     * Delete a vendor evaluation
     */
    static async deleteVendorEvaluation(client: SupabaseClient, id: string): Promise<void> {
        try {
            const { error } = await client
                .from('contract_vendors')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting vendor evaluation:', error);
            throw error;
        }
    }

    /**
     * Mark vendor(s) as appointed
     */
    static async setAppointedVendors(client: SupabaseClient, contractId: string, vendorIds: string[]): Promise<void> {
        try {
            // First, unmark all vendors for this contract
            await client
                .from('contract_vendors')
                .update({ is_appointed: false })
                .eq('contract_id', contractId);

            // Then mark the selected vendors as appointed
            if (vendorIds.length > 0) {
                await client
                    .from('contract_vendors')
                    .update({ is_appointed: true })
                    .in('id', vendorIds);
            }
        } catch (error) {
            console.error('Error setting appointed vendors:', error);
            throw error;
        }
    }

    /**
     * Get appointed vendors for a contract
     */
    static async getAppointedVendors(client: SupabaseClient, contractId: string): Promise<VendorEvaluation[]> {
        try {
            const { data, error } = await client
                .from('contract_vendors')
                .select('*')
                .eq('contract_id', contractId)
                .eq('is_appointed', true);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching appointed vendors:', error);
            throw error;
        }
    }

    /**
     * Calculate total contract amount from appointed vendors
     */
    static async calculateTotalContractAmount(client: SupabaseClient, contractId: string): Promise<number> {
        try {
            const appointedVendors = await this.getAppointedVendors(client, contractId);

            let total = 0;
            for (const vendor of appointedVendors) {
                const amount = parseFloat(vendor.revised_price_note || vendor.price_note || '0');
                total += amount;
            }

            return total;
        } catch (error) {
            console.error('Error calculating total contract amount:', error);
            return 0;
        }
    }

    /**
     * Calculate price difference for a vendor
     */
    static calculatePriceDifference(originalPrice: string, revisedPrice: string): {
        difference: number;
        percentage: number;
        isSaving: boolean;
    } {
        const original = parseFloat(originalPrice || '0');
        const revised = parseFloat(revisedPrice || originalPrice || '0');
        const difference = original - revised;
        const percentage = original > 0 ? (difference / original) * 100 : 0;

        return {
            difference,
            percentage,
            isSaving: difference > 0,
        };
    }

    /**
     * Bulk update vendor evaluations
     */
    static async bulkUpdateVendors(client: SupabaseClient, vendors: Array<Partial<VendorEvaluation> & { id: string }>): Promise<void> {
        try {
            const updates = vendors.map(vendor =>
                this.updateVendorEvaluation(client, vendor.id, vendor)
            );
            await Promise.all(updates);
        } catch (error) {
            console.error('Error bulk updating vendors:', error);
            throw error;
        }
    }
}
