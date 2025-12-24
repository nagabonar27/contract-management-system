import { useState, useEffect, useCallback } from 'react';
import { ContractService, Contract } from '@/services/contractService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Hook for fetching and managing a single contract
 */
export function useContract(id: string | null) {
    const supabase = createClientComponentClient();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContract = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getContract(supabase, id);
            setContract(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch contract');
            console.error('Error in useContract:', err);
        } finally {
            setLoading(false);
        }
    }, [id, supabase]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const updateContract = async (updates: Partial<Contract>) => {
        if (!id) return;

        try {
            setError(null);
            const updated = await ContractService.updateContract(supabase, id, updates);
            setContract(updated);
            return updated;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update contract');
            throw err;
        }
    };

    const deleteContract = async () => {
        if (!id) return;

        try {
            setError(null);
            await ContractService.deleteContract(supabase, id);
            setContract(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete contract');
            throw err;
        }
    };

    return {
        contract,
        loading,
        error,
        refetch: fetchContract,
        updateContract,
        deleteContract,
    };
}

/**
 * Hook for fetching multiple contracts with filtering
 */
export function useContracts(filters?: Parameters<typeof ContractService.getAllContracts>[1]) {
    const supabase = createClientComponentClient();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getAllContracts(supabase, filters);
            setContracts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch contracts');
            console.error('Error in useContracts:', err);
        } finally {
            setLoading(false);
        }
    }, [filters, supabase]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    return {
        contracts,
        loading,
        error,
        refetch: fetchContracts,
    };
}

/**
 * Hook for fetching active contracts
 */
export function useActiveContracts() {
    return useContracts({ status: 'Active' });
}

/**
 * Hook for fetching expiring contracts
 */
export function useExpiringContracts(daysUntilExpiry: number = 120) {
    const supabase = createClientComponentClient();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getExpiringContracts(supabase, daysUntilExpiry);
            setContracts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch expiring contracts');
            console.error('Error in useExpiringContracts:', err);
        } finally {
            setLoading(false);
        }
    }, [daysUntilExpiry, supabase]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    return {
        contracts,
        loading,
        error,
        refetch: fetchContracts,
    };
}

/**
 * Hook for creating amendments
 */
export function useAmendment() {
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createAmendment = async (originalContractId: string) => {
        try {
            setLoading(true);
            setError(null);
            const amendment = await ContractService.createAmendment(supabase, originalContractId);
            return amendment;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create amendment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        createAmendment,
        loading,
        error,
    };
}

/**
 * Hook for fetching contract versions
 */
export function useContractVersions(contractNumber: string | null) {
    const supabase = createClientComponentClient();
    const [versions, setVersions] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVersions = useCallback(async () => {
        if (!contractNumber) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getContractVersions(supabase, contractNumber);
            setVersions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch versions');
            console.error('Error in useContractVersions:', err);
        } finally {
            setLoading(false);
        }
    }, [contractNumber, supabase]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    return {
        versions,
        loading,
        error,
        refetch: fetchVersions,
    };
}
