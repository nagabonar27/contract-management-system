export const isAdmin = (position: string | null | undefined) => {
    if (!position) return false;

    const adminPositions = ["admin", "data & system analyst"];
    return adminPositions.includes(position.toLowerCase().trim());
};