export const INVENTORY_CONDITIONS = {
    NEW: 'NEW',
    DISMANTLE: 'DISMANTLE',
    DAMAGED: 'DAMAGED',
} as const;

export type InventoryCondition = typeof INVENTORY_CONDITIONS[keyof typeof INVENTORY_CONDITIONS];

export const INVENTORY_STATUSES = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    RESERVED: 'Reserved',
    DAMAGED: 'Rusak',
} as const;

export type InventoryStatus = typeof INVENTORY_STATUSES[keyof typeof INVENTORY_STATUSES];

export const INVENTORY_TYPES = {
    NEW: 'New',
    DISMANTLE: 'Dismantle',
    DAMAGED: 'Rusak',
} as const;

export type InventoryType = typeof INVENTORY_TYPES[keyof typeof INVENTORY_TYPES];
