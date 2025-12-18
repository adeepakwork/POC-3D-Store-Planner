export const STORE_COLORS = [
    { name: 'Ocean Blue', hex: '#3B82F6' },
    { name: 'Royal Purple', hex: '#8B5CF6' },
    { name: 'Hot Pink', hex: '#EC4899' },
    { name: 'Amber Gold', hex: '#F59E0B' },
    { name: 'Emerald Green', hex: '#10B981' },
    { name: 'Ruby Red', hex: '#EF4444' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Teal', hex: '#14B8A6' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Lime Green', hex: '#84CC16' },
    { name: 'Slate Gray', hex: '#64748B' },
    { name: 'Rose', hex: '#F43F5E' },
];

// DEPRECATED: Inventory is now managed via Database / InventoryPage
/*
export const PRODUCTS = [
    {
        id: 'prod-1',
        name: 'Pasta',
        sku: 'PASTA-001',
        unit: 'box',
        price: 2.99,
        unitPrice: '$4.00/kg',
        color: '#e3c086',
        dimensions: { width: 0.15, height: 0.25, depth: 0.08 } // 15x25x8 cm
    },
    ...
];
*/

export const DEFAULT_AISLE = {
    height: 3,
    shelves: 6,
};

export const calculateShelfCount = (aisleHeight: number): number => {
    const BOTTOM_CLEARANCE = 0.15;
    const MAX_ACCESSIBLE_HEIGHT = 2.1;
    const SHELF_SPACING = 0.35;

    const usableHeight = Math.min(aisleHeight, MAX_ACCESSIBLE_HEIGHT) - BOTTOM_CLEARANCE;
    const shelfCount = Math.floor(usableHeight / SHELF_SPACING);

    return Math.max(1, Math.min(10, shelfCount));
};

// Generic average for fallbacks
export const PRODUCT_SIZE = {
    width: 0.15,
    depth: 0.15,
    height: 0.25,
};

// Calculate accurate shelf capacity based on actual volume
export const calculateShelfCapacity = (aisleWidth: number, aisleLength: number, productId?: string): number => {
    // 1. Get product dimensions (specific or average)
    let prodDims = PRODUCT_SIZE;
    // Legacy lookup removed as PRODUCTS is deprecated.

    const WALKWAY_WIDTH = 1.5;

    // 2. Calculate Usable Shelf Space
    // Length: How many products fit side-by-side along the aisle length
    const countAlongLength = Math.floor(aisleLength / prodDims.width);

    // Depth: How many rows deep on ONE side
    const shelfDepthPerSide = Math.max(0.1, (aisleWidth - WALKWAY_WIDTH) / 2);
    const countDeep = Math.floor(shelfDepthPerSide / prodDims.depth);

    // 3. Total Capacity
    // (Items Lengthwise) * (Items Deep) * (2 Sides)
    return Math.max(1, countAlongLength * countDeep * 2);
};

export const calculateTotalAisleCapacity = (
    aisleWidth: number,
    aisleLength: number,
    shelfCount: number
): number => {
    // Use average product size for general estimation
    const perShelfCapacity = calculateShelfCapacity(aisleWidth, aisleLength);
    return perShelfCapacity * shelfCount;
};

export const CONFIG = {
    gridSize: 20,
    scale: 20,
    canvasWidth: 2000,
    canvasHeight: 2000,
};
