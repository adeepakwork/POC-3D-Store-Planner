import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Store, Aisle, ViewMode, InventoryProduct, PlacedBox } from '@/types';

interface StoreState {
    stores: Store[];
    aisles: Aisle[];
    inventory: InventoryProduct[];
    placedBoxes: PlacedBox[];  // Tracked moved boxes
    currentStoreId: string | null;
    selectedAisleId: string | null;
    viewMode: ViewMode;

    // Actions
    setViewMode: (mode: ViewMode) => void;
    setCurrentStore: (store: Store) => void;
    setAisles: (aisles: Aisle[]) => void;
    setSelectedAisle: (aisleId: string | null) => void;

    addStore: (store: Store) => void;
    updateStore: (storeId: string, updates: Partial<Store>) => void;
    deleteStore: (storeId: string) => void;

    addAisle: (aisle: Aisle) => void;
    updateAisle: (aisleId: string, updates: Partial<Aisle>) => void;
    deleteAisle: (aisleId: string) => void;

    // Inventory Actions
    setInventory: (inventory: InventoryProduct[]) => void;
    addInventoryProduct: (product: InventoryProduct) => void;
    updateInventoryProduct: (id: string, updates: Partial<InventoryProduct>) => void;
    deleteInventoryProduct: (id: string) => void;

    getCurrentStore: () => Store | undefined;
    getCurrentAisles: () => Aisle[];
    getSelectedAisle: () => Aisle | undefined;
    getInventory: () => InventoryProduct[];

    // Placed Box Actions (for box movement)
    addPlacedBox: (box: PlacedBox) => void;
    removePlacedBox: (id: string) => void;
    resetPlacedBoxes: () => void;
    getPlacedBoxes: () => PlacedBox[];
}

const useStore = create<StoreState>()(
    devtools(
        persist(
            (set, get) => ({
                stores: [],
                aisles: [],
                inventory: [],
                placedBoxes: [],
                currentStoreId: null,
                selectedAisleId: null,
                viewMode: '2d',

                setViewMode: (mode) => set({ viewMode: mode }),

                setCurrentStore: (store) => set((state) => {
                    const existingIndex = state.stores.findIndex(s => s.id === store.id);

                    if (existingIndex >= 0) {
                        const updatedStores = [...state.stores];
                        updatedStores[existingIndex] = store;
                        return {
                            stores: updatedStores,
                            currentStoreId: store.id,
                            selectedAisleId: null,
                        };
                    } else {
                        return {
                            stores: [...state.stores, store],
                            currentStoreId: store.id,
                            selectedAisleId: null,
                        };
                    }
                }),

                setAisles: (aisles) => set({ aisles }),

                setSelectedAisle: (aisleId) => set({ selectedAisleId: aisleId }),

                addStore: (store) => {
                    set((state) => ({ stores: [...state.stores, store] }));
                },

                updateStore: (storeId, updates) => {
                    set((state) => ({
                        stores: state.stores.map((store) =>
                            store.id === storeId
                                ? { ...store, ...updates, updatedAt: new Date() }
                                : store
                        ),
                    }));
                },

                deleteStore: (storeId) => {
                    set((state) => ({
                        stores: state.stores.filter((store) => store.id !== storeId),
                        aisles: state.aisles.filter((aisle) => aisle.storeId !== storeId),
                        currentStoreId: state.currentStoreId === storeId ? null : state.currentStoreId,
                    }));
                },

                addAisle: (aisle) => {
                    set((state) => ({
                        aisles: [...state.aisles, aisle],
                    }));
                },

                updateAisle: (aisleId, updates) => {
                    set((state) => ({
                        aisles: state.aisles.map((aisle) =>
                            aisle.id === aisleId ? { ...aisle, ...updates } : aisle
                        ),
                    }));
                },

                deleteAisle: (aisleId) => {
                    set((state) => ({
                        aisles: state.aisles.filter((aisle) => aisle.id !== aisleId),
                        selectedAisleId: state.selectedAisleId === aisleId ? null : state.selectedAisleId,
                    }));
                },

                // Inventory Actions
                setInventory: (inventory) => set({ inventory }),

                addInventoryProduct: (product) => set((state) => ({
                    inventory: [...state.inventory, product]
                })),

                updateInventoryProduct: (id, updates) => set((state) => ({
                    inventory: state.inventory.map(p => p.id === id ? { ...p, ...updates } : p)
                })),

                deleteInventoryProduct: (id) => set((state) => ({
                    inventory: state.inventory.filter(p => p.id !== id)
                })),

                getCurrentStore: () => {
                    const state = get();
                    return state.stores.find((store) => store.id === state.currentStoreId);
                },

                getCurrentAisles: () => {
                    const state = get();
                    return state.aisles.filter((aisle) => aisle.storeId === state.currentStoreId);
                },

                getSelectedAisle: () => {
                    const state = get();
                    return state.aisles.find((aisle) => aisle.id === state.selectedAisleId);
                },

                getInventory: () => get().inventory,

                // Placed Box Actions
                addPlacedBox: (box) => set((state) => ({
                    placedBoxes: [...state.placedBoxes, box]
                })),

                removePlacedBox: (id) => set((state) => ({
                    placedBoxes: state.placedBoxes.filter(b => b.id !== id)
                })),

                resetPlacedBoxes: () => set({ placedBoxes: [] }),

                getPlacedBoxes: () => get().placedBoxes,
            }),
            {
                name: '3d-store-planner-storage',
            }
        )
    )
);

export default useStore;
