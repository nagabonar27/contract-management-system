{/* contract process */ }

// ongoing process
export const CONTRACT_STATUS = {
    ON_GOING: 'On Going',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
} as const;


// 3. Helper for UI Badges (Colors)
export const STATUS_COLORS = {
    [CONTRACT_STATUS.ON_GOING]: 'bg-gray-500',       // Gray
    [CONTRACT_STATUS.ACTIVE]: 'bg-green-600',     // Green
    [CONTRACT_STATUS.EXPIRED]: 'bg-red-500',      // Red
};

// 4. Type Definitions (for use in components)
export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];

export const BID_AGENDA_STEPS = [
    "Contract Drafting",
    "Draft Completed",
    "Review & Clarification",
    "Vendor Findings",
    "KYC Review",
    "Vendor Administratif & Bid Document",
    "Price Proposal",
    "Clarification Meeting",
    "Clarification Period & Response",
    "Revised Price Proposal",
    "Technical Evaluation",
    "Price Comparison",
    "Appointed Vendor",
    "Negotiation",
    "Procurement Summary Preparation",
    "Procurement Summary Management Approval",
    "Contract Drafting",
    "Contract Finalization",
    "Vendor Contract Finalization",
    "Internal Contract Signature",
    "Vendor Contract Signature",
    "Contract Completed"
] as const;
