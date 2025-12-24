export const isAdmin = (position: string | null | undefined) => {
    if (!position) return false;

    const adminPositions = ["admin", "data & system analyst"];
    return adminPositions.includes(position.toLowerCase().trim());
};

export const canViewAllContracts = (position: string | null | undefined) => {
    if (!position) return false;

    const allowedPositions = [
        "admin",
        "data & system analyst",
        "procurement manager",
        "procurement & logistic division head"
    ];
    return allowedPositions.includes(position.toLowerCase().trim());
};