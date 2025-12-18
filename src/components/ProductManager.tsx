'use client';

import { useState, useEffect } from 'react';
import useStore from '@/stores/useStore';
import { updateAisle as updateAisleInDb, getUserInventory } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AisleProduct, InventoryProduct } from '@/types';
import Link from 'next/link';

interface ProductManagerProps {
    aisleId: string;
    products: AisleProduct[];
}

export default function ProductManager({ aisleId, products }: ProductManagerProps) {
    const {
        inventory,
        setInventory,
        updateAisle,
        getSelectedAisle,
        getCurrentAisles
    } = useStore();

    const [showPicker, setShowPicker] = useState(false);
    const [selectedInvProduct, setSelectedInvProduct] = useState<InventoryProduct | null>(null);
    const [boxQuantity, setBoxQuantity] = useState(10);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        const fetchInventory = async () => {
            if (inventory.length === 0) {
                setIsLoadingInventory(true);
                try {
                    const user = await getCurrentUser();
                    if (user) {
                        const data = await getUserInventory(user.uid);
                        if (data.length > 0) {
                            setInventory(data);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch inventory", e);
                } finally {
                    setIsLoadingInventory(false);
                }
            }
        };

        if (showPicker) {
            fetchInventory();
        }
    }, [showPicker, inventory.length, setInventory]);

    const aisle = getSelectedAisle();
    if (!aisle) return null;

    // Calculate available stock (total in inventory - already allocated across all aisles)
    const getAvailableStock = (productId: string, totalStock: number): number => {
        const allAisles = getCurrentAisles();
        let allocated = 0;

        for (const a of allAisles) {
            for (const p of a.products) {
                if (p.productId === productId) {
                    allocated += p.quantityBoxes || 0;
                }
            }
        }

        return Math.max(0, totalStock - allocated);
    };

    const handleSelectProduct = (product: InventoryProduct) => {
        setSelectedInvProduct(product);
        // Set initial quantity to min of 10 or available
        const available = getAvailableStock(product.id, product.totalBoxesStock);
        setBoxQuantity(Math.min(10, available));
    };

    const handleConfirmAdd = async () => {
        if (!selectedInvProduct || !aisle || isConfirming) return;

        setIsConfirming(true);

        // Auto-Fill Logic: 
        // Find shelf with fewest items to distribute load evenly
        const shelfCounts = Array.from({ length: aisle.shelves }, (_, i) => 0);
        products.forEach(p => {
            if (p.shelfLevel > 0 && p.shelfLevel <= aisle.shelves) {
                shelfCounts[p.shelfLevel - 1]++;
            }
        });
        const minVal = Math.min(...shelfCounts);
        const targetShelf = shelfCounts.indexOf(minVal) + 1;

        const newProduct: AisleProduct = {
            id: `aprod-${Date.now()}`,
            productId: selectedInvProduct.id,
            aisleId: aisleId,
            quantityBoxes: boxQuantity, // Store BOXES
            shelfLevel: targetShelf,
            position: products.length,
        };

        const updatedProducts = [...products, newProduct];
        updateAisle(aisleId, { products: updatedProducts });

        try {
            await updateAisleInDb(aisleId, { products: updatedProducts });
        } catch (error) {
            console.error('Failed to add product:', error);
        } finally {
            setIsConfirming(false);
        }

        resetAndClose();
    };

    const resetAndClose = () => {
        setSelectedInvProduct(null);
        setShowPicker(false);
        setBoxQuantity(10);
    };

    const handleRemoveProduct = async (id: string) => {
        const updatedProducts = products.filter(p => p.id !== id);
        updateAisle(aisleId, { products: updatedProducts });
        try {
            await updateAisleInDb(aisleId, { products: updatedProducts });
        } catch (error) {
            console.error('Failed to remove', error);
        }
    };

    // Helper to get inventory details
    const getInvDetails = (invId: string) => inventory.find(i => i.id === invId);

    return (
        <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-700">Shelf Contents</h4>
                <Link href="/inventory" className="text-xs text-blue-600 hover:underline">
                    Manage Inventory &rarr;
                </Link>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {products.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed">
                        Empty Shelves
                    </div>
                ) : (
                    products.map((item) => {
                        const inv = getInvDetails(item.productId);
                        if (!inv) return null;
                        return (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded border" style={{ backgroundColor: inv.labelColor }} />
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{inv.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {item.quantityBoxes} boxes • Shelf {item.shelfLevel}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleRemoveProduct(item.id)} className="text-red-400 hover:text-red-600">
                                    &times;
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            <button
                onClick={() => setShowPicker(true)}
                className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow transition-all"
            >
                + Place Inventory on Shelf
            </button>

            {/* Modal */}
            {showPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Select Inventory to Stock</h3>
                            <button onClick={resetAndClose} className="text-gray-400 hover:text-black">&times;</button>
                        </div>

                        <div className="p-0">
                            {isLoadingInventory && inventory.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">Loading inventory...</div>
                            ) : !selectedInvProduct ? (
                                // LIST VIEW
                                <div className="max-h-[60vh] overflow-y-auto p-4 grid grid-cols-2 gap-3">
                                    {inventory.map(p => {
                                        const available = getAvailableStock(p.id, p.totalBoxesStock);
                                        const isOutOfStock = available === 0;

                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => !isOutOfStock && handleSelectProduct(p)}
                                                disabled={isOutOfStock}
                                                className={`flex flex-col items-center p-4 border rounded-xl transition-all text-center group ${isOutOfStock
                                                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                                    : 'hover:border-blue-500 hover:bg-blue-50'
                                                    }`}
                                            >
                                                <div className="w-12 h-12 rounded mb-2 shadow-sm" style={{ backgroundColor: p.labelColor }} />
                                                <div className="font-bold text-gray-900">{p.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {p.boxDimensions ? `${(p.boxDimensions.width * 100).toFixed(0)}×${(p.boxDimensions.height * 100).toFixed(0)}cm` : 'Std Size'}
                                                </div>
                                                <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded ${isOutOfStock
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-gray-100 text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-800'
                                                    }`}>
                                                    {isOutOfStock ? 'Fully Allocated' : `Avail: ${available} boxes`}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    <Link href="/inventory" className="flex flex-col items-center justify-center p-4 border border-dashed rounded-xl hover:bg-gray-50 text-gray-500 hover:text-blue-600">
                                        <span className="text-2xl mb-1">+</span>
                                        <span className="text-sm font-medium">Create New Item</span>
                                    </Link>
                                </div>
                            ) : (
                                // CONFIGURE VIEW
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-lg shadow-md" style={{ backgroundColor: selectedInvProduct.labelColor }} />
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedInvProduct.name}</h2>
                                            <div className="text-sm text-gray-500">
                                                {selectedInvProduct.itemsPerBox} items/box • {selectedInvProduct.sku}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <label className="block text-sm font-bold text-blue-800 mb-2">
                                                How many BOXES to place?
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={getAvailableStock(selectedInvProduct.id, selectedInvProduct.totalBoxesStock)}
                                                    value={boxQuantity}
                                                    onChange={e => {
                                                        const max = getAvailableStock(selectedInvProduct.id, selectedInvProduct.totalBoxesStock);
                                                        setBoxQuantity(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)));
                                                    }}
                                                    className="w-32 text-2xl font-bold p-2 border rounded text-center"
                                                />
                                                <div className="text-sm text-gray-600">
                                                    = <strong className="text-black">{boxQuantity * selectedInvProduct.itemsPerBox}</strong> individual items
                                                </div>
                                            </div>
                                            <p className="text-xs text-blue-600 mt-2">
                                                Available: {getAvailableStock(selectedInvProduct.id, selectedInvProduct.totalBoxesStock)} of {selectedInvProduct.totalBoxesStock} boxes
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <button
                                            onClick={() => setSelectedInvProduct(null)}
                                            className="px-4 py-3 bg-gray-100 font-semibold rounded-lg hover:bg-gray-200 text-gray-700"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleConfirmAdd}
                                            disabled={isConfirming}
                                            className={`flex-1 px-4 py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 ${isConfirming
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                        >
                                            {isConfirming ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Placing...</span>
                                                </>
                                            ) : (
                                                'Confirm & Place on Shelf'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
