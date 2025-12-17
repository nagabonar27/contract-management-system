import { useState, useEffect, useCallback } from 'react';
import { ContractService, Contract } from '@/services/contractService';

/**
 * Hook for fetching and managing a single contract
 */
export function useContract(id: string | null) {
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
            const data = await ContractService.getContract(id);
            setContract(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch contract');
            console.error('Error in useContract:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const updateContract = async (updates: Partial<Contract>) => {
        if (!id) return;

        try {
            setError(null);
            const updated = await ContractService.updateContract(id, updates);
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
            await ContractService.deleteContract(id);
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
export function useContracts(filters?: Parameters<typeof ContractService.getAllContracts>[0]) {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getAllContracts(filters);
            setContracts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch contracts');
            console.error('Error in useContracts:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

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
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContracts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await ContractService.getExpiringContracts(daysUntilExpiry);
            setContracts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch expiring contracts');
            console.error('Error in useExpiringContracts:', err);
        } finally {
            setLoading(false);
        }
    }, [daysUntilExpiry]);

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createAmendment = async (originalContractId: string) => {
        try {
            setLoading(true);
            setError(null);
            const amendment = await ContractService.createAmendment(originalContractId);
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
            const data = await ContractService.getContractVersions(contractNumber);
            setVersions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch versions');
            console.error('Error in useContractVersions:', err);
        } finally {
            setLoading(false);
        }
    }, [contractNumber]);

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
