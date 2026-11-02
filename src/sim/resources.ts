export const RESOURCES = ['iron', 'copper', 'ice', 'silicon', 'rareMetals'] as const;
export type Resource = typeof RESOURCES[number];
export type Inventory = Record<Resource, number>;
export const RESOURCE_INFO: Record<Resource, { label: string; color: number }> = {
  iron: { label: 'Iron', color: 0xb3c3ce }, copper: { label: 'Copper', color: 0xf5ab79 },
  ice: { label: 'Ice', color: 0x86e0ff }, silicon: { label: 'Silicon', color: 0xc9b2ef },
  rareMetals: { label: 'Rare metals', color: 0xf3d779 },
};
export const emptyInventory = (): Inventory => ({ iron: 0, copper: 0, ice: 0, silicon: 0, rareMetals: 0 });
export const inventoryMass = (inventory: Inventory): number => RESOURCES.reduce((sum, type) => sum + inventory[type], 0);
export const CARGO_CAPACITY = 120;
