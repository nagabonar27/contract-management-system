import { supabase } from './contractService';

// ============================================
// Agenda Service - Bid Agenda Operations
// ============================================

export interface AgendaItem {
    id: string;
    contract_id: string;
    step_name: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    remarks?: string;
    updated_at?: string;
}

export class AgendaService {
    /**
     * Get all agenda items for a contract
     */
    static async getContractAgenda(contractId: string): Promise<AgendaItem[]> {
        try {
            const { data, error } = await supabase
                .from('contract_bid_agenda')
                .select('*')
                .eq('contract_id', contractId)
                .order('updated_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching agenda:', error);
            throw error;
        }
    }

    /**
     * Create a new agenda item
     */
    static async createAgendaItem(agendaData: Omit<AgendaItem, 'id' | 'updated_at'>): Promise<AgendaItem> {
        try {
            const { data, error } = await supabase
                .from('contract_bid_agenda')
                .insert([agendaData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating agenda item:', error);
            throw error;
        }
    }

    /**
     * Update an agenda item
     */
    static async updateAgendaItem(id: string, updates: Partial<AgendaItem>): Promise<AgendaItem> {
        try {
            const { data, error } = await supabase
                .from('contract_bid_agenda')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating agenda item:', error);
            throw error;
        }
    }

    /**
     * Delete an agenda item
     */
    static async deleteAgendaItem(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('contract_bid_agenda')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting agenda item:', error);
            throw error;
        }
    }

    /**
     * Bulk update agenda items
     */
    static async bulkUpdateAgenda(items: Array<Partial<AgendaItem> & { id: string }>): Promise<void> {
        try {
            const updates = items.map(item =>
                this.updateAgendaItem(item.id, item)
            );
            await Promise.all(updates);
        } catch (error) {
            console.error('Error bulk updating agenda:', error);
            throw error;
        }
    }

    /**
     * Check if signature steps are completed
     */
    static async areSignatureStepsCompleted(contractId: string): Promise<boolean> {
        try {
            const agenda = await this.getContractAgenda(contractId);

            const internalSignature = agenda.find(item =>
                item.step_name.toLowerCase().includes('internal') &&
                item.step_name.toLowerCase().includes('signature')
            );

            const vendorSignature = agenda.find(item =>
                item.step_name.toLowerCase().includes('vendor') &&
                item.step_name.toLowerCase().includes('signature')
            );

            return !!(
                internalSignature?.start_date &&
                internalSignature?.end_date &&
                vendorSignature?.start_date &&
                vendorSignature?.end_date
            );
        } catch (error) {
            console.error('Error checking signature steps:', error);
            return false;
        }
    }

    /**
     * Get current step from agenda
     */
    static async getCurrentStep(contractId: string): Promise<string | null> {
        try {
            const agenda = await this.getContractAgenda(contractId);

            // Find the latest completed step
            const completedSteps = agenda.filter(item => item.end_date);
            if (completedSteps.length === 0) return null;

            // Sort by updated_at descending
            completedSteps.sort((a, b) =>
                new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime()
            );

            return completedSteps[0]?.step_name || null;
        } catch (error) {
            console.error('Error getting current step:', error);
            return null;
        }
    }
}
