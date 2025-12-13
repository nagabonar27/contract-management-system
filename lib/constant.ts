{/* contract process */ }

// ongoing process
export const CONTRACT_STATUS = {
    ON_GOING: 'On Going',
    ACTIVE: 'Active',
    EXPIRED: 'Expired',
} as const;

// process
export const ONGOING_STEPS = {
    WAITING_DOC_FROM_USER: 'Waiting for Document from User',
    REVIEW_CLARIFICATION: 'Waiting for Legal',
    KYC: 'Vendor Signing',
    WAITING_PROPOSAL: 'Management Approval',
    SOUNDING_FROM_USER: 'Sounding from User',
    TECHNICAL_EVALUATION: 'Technical Evaluation',
    NEGOTIATION: 'Negotiation',
    AWARD_REC_PREPARATION: 'Award Rec Preparation',
    AWARD_REC_APPROVAL_ROUTING: 'Award Rec Approval Routing',
    CONTRACT_PREP: 'Contract Prep',
    INTERNAL_CONTRACT_APPROVAL_ROUTING: 'Internal Contract Approval Routing',
    VENDOR_APPROVAL_ROUTING: 'Vendor Approval Routing',
    COMPLETED: 'Completed'
} as const;

// 3. Helper for UI Badges (Colors)
export const STATUS_COLORS = {
    [CONTRACT_STATUS.ON_GOING]: 'bg-gray-500',       // Gray
    [CONTRACT_STATUS.ACTIVE]: 'bg-green-600',     // Green
    [CONTRACT_STATUS.EXPIRED]: 'bg-red-500',      // Red
};

// 4. Type Definitions (for use in components)
export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];
export type OngoingStep = typeof ONGOING_STEPS[keyof typeof ONGOING_STEPS];

export const BID_AGENDA_STEPS = [
    "Draft Contract (from legal, depends on the type of work and understanding SOW)",
    "Complete CR, KAK & Template Ketentuan Khusus from user",
    "Review, understanding Document above and clarification",
    "Vendor Findings",
    "KYC Review",
    "Invite Vendor request for administrative document, Share doc & bid document",
    "Price Proposal",
    "Clarification Meeting",
    "Clarification Period & Response",
    "Revised Price Proposal",
    "Technical Evaluation & Contract clarification & User Recommendation",
    "Price Comparison",
    "Appointed Vendor",
    "Negotiation",
    "Preparation Summary Pengadaan",
    "Management Approval Summary Pengadaan",
    "Contract Drafting",
    "Contract Finalization",
    "Vendor Contract Finalization",
    "Internal Contract Signature Process",
    "Vendor Contract Signature Process",
    "Completed"
] as const;
