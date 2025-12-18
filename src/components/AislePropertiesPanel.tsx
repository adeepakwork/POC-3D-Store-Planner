'use client';

import useStore from '@/stores/useStore';
import { deleteAisle as deleteAisleFromDb, updateAisle as updateAisleInDb } from '@/lib/db';
import { useModal } from './ModalProvider';
import { calculateShelfCount } from '@/lib/constants';
import ProductManager from './ProductManager';

export default function AislePropertiesPanel() {
    const {
        getSelectedAisle,
        selectedAisleId,
        setSelectedAisle,
        updateAisle,
        deleteAisle,
        currentStoreId,
    } = useStore();

    const modal = useModal();

    const selectedAisle = getSelectedAisle();

    if (!selectedAisle || !currentStoreId) {
        return null;
    }

    const handleUpdate = async (field: string, value: number) => {
        let updates: Record<string, number> = { [field]: value };

        // Auto-calculate shelf count when height changes
        if (field === 'height') {
            const newShelfCount = calculateShelfCount(value);
            updates.shelves = newShelfCount;
        }

        // Update local state
        updateAisle(selectedAisle.id, updates);

        // Update in Firestore
        try {
            await updateAisleInDb(selectedAisle.id, updates);
        } catch (error) {
            console.error('Failed to update aisle in Firestore:', error);
        }
    };

    const handleDelete = async () => {
        const aisleToDelete = selectedAisle; // Capture before clearing

        const confirmed = await modal.confirm({
            title: 'Delete Aisle?',
            message: `Are you sure you want to delete "${aisleToDelete.name}"? This action cannot be undone.`,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            type: 'danger',
        });

        if (confirmed) {
            // Clear selection immediately for smooth UX (hides the panel)
            setSelectedAisle(null);
            deleteAisle(aisleToDelete.id);

            // Delete from Firestore in background
            try {
                await deleteAisleFromDb(aisleToDelete.id);
            } catch (error) {
                console.error('Failed to delete aisle from Firestore:', error);
                // Note: Could optionally re-add the aisle if Firestore delete fails
            }
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col gap-4 shadow-lg overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 border-b-2 border-gray-200 pb-3">
                Aisle Properties
            </h3>

            {/* Aisle Name - Editable */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Name</label>
                <input
                    type="text"
                    value={selectedAisle.name}
                    onChange={(e) => {
                        updateAisle(selectedAisle.id, { name: e.target.value });
                    }}
                    onBlur={async (e) => {
                        try {
                            await updateAisleInDb(selectedAisle.id, { name: e.target.value });
                        } catch (error) {
                            console.error('Failed to update name:', error);
                        }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Width (m)</label>
                <input
                    type="number"
                    step="0.5"
                    value={selectedAisle.width}
                    onChange={(e) => handleUpdate('width', Math.max(1, parseFloat(e.target.value)))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Depth (m)</label>
                <input
                    type="number"
                    step="0.5"
                    value={selectedAisle.length}
                    onChange={(e) => handleUpdate('length', Math.max(1, parseFloat(e.target.value)))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Height (m)</label>
                <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={isNaN(selectedAisle.height) ? '' : selectedAisle.height}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                            handleUpdate('height', Math.max(1, val));
                        }
                    }}
                    className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${!selectedAisle.height || selectedAisle.height < 1
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                />
                {(!selectedAisle.height || selectedAisle.height < 1) && (
                    <span className="text-xs text-red-500">Height must be at least 1m</span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Position X</label>
                <input
                    type="number"
                    step="1"
                    value={selectedAisle.x}
                    onChange={(e) => handleUpdate('x', parseFloat(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Position Z</label>
                <input
                    type="number"
                    step="1"
                    value={selectedAisle.z}
                    onChange={(e) => handleUpdate('z', parseFloat(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Shelf Count</label>
                <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={selectedAisle.shelves}
                    onChange={(e) => handleUpdate('shelves', Math.max(1, parseInt(e.target.value)))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Product Manager */}
            <ProductManager
                aisleId={selectedAisle.id}
                products={selectedAisle.products || []}
            />

            <div className="mt-auto pt-4">
                <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    Delete Aisle
                </button>
            </div>
        </div>
    );
}
