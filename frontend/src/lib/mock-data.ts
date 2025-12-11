export const MOCK_STATS = [
    { step_name: 'Waiting Doc from User', count: 3 },
    { step_name: 'Review & Clarification', count: 5 },
    { step_name: 'KYC', count: 2 },
    { step_name: 'Negotiation', count: 1 },
    { step_name: 'Completed', count: 12 }
];

export const MOCK_ONGOING = [
    {
        id: 101,
        contract_name: 'Heavy Machinery Supply - Alpha',
        contract_type: 'Direct Selection',
        step_name: 'Review & Clarification',
        is_active_process: 1
    },
    {
        id: 102,
        contract_name: 'IT Support Services Q4',
        contract_type: 'Pending',
        step_name: 'Waiting Doc from User',
        is_active_process: 1
    },
    {
        id: 103,
        contract_name: 'Amendment to Service Agreement X',
        contract_type: 'Amendment',
        step_name: 'Negotiation',
        is_active_process: 1
    },
    {
        id: 104,
        contract_name: 'Office Supplies Batch 2025',
        contract_type: 'Direct Appointment',
        step_name: 'KYC',
        is_active_process: 1
    }
];

export const MOCK_ACTIVE_CONTRACTS = [
    {
        contract_id: 1,
        master_id: 501,
        ongoing_id: 99,
        contract_number: 'LGL-2024-001',
        contract_version: 1,
        contract_name: 'Annual Security Service',
        contract_type: 'Direct Selection',
        effective_date: '2024-01-15'
    },
    {
        contract_id: 2,
        master_id: 502,
        ongoing_id: 88,
        contract_number: 'LGL-2024-002',
        contract_version: 1,
        contract_name: 'Cloud Infrastructure Provider',
        contract_type: 'Direct Appointment',
        effective_date: '2024-02-01'
    }
];
