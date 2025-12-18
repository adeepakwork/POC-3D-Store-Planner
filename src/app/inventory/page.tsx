'use client';

import { useState, useEffect } from 'react';
import useStore from '@/stores/useStore';
import { InventoryProduct } from '@/types';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    getUserInventory,
    createInventoryProduct,
    updateInventoryProduct as updateInventoryInDb,
    deleteInventoryProduct as deleteInventoryInDb
} from '@/lib/db';
import { getCurrentUser, User } from '@/lib/auth';
import { BOX_SIZES, BoxSizeKey } from '@/components/BoxPreview3D';

// Dynamic import for 3D preview (client-only)
const BoxPreview3D = dynamic(() => import('@/components/BoxPreview3D'), { ssr: false });

export default function InventoryPage() {
    const { inventory, setInventory, addInventoryProduct, updateInventoryProduct, deleteInventoryProduct } = useStore();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState<BoxSizeKey>('medium');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Get current user and load inventory
    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUser(user);

                if (user) {
                    const data = await getUserInventory(user.uid);
                    setInventory(data);
                }
            } catch (error) {
                console.error("Failed to load inventory:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [setInventory]);

    // Form State
    const [formData, setFormData] = useState<Partial<InventoryProduct>>({
        name: '',
        sku: '',
        category: 'General',
        labelColor: '#3B82F6',
        itemsPerBox: 12,
        pricePerItem: 0,
        totalBoxesStock: 100,
        boxDimensions: BOX_SIZES.medium
    });

    // Update dimensions when size changes
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            boxDimensions: BOX_SIZES[selectedSize]
        }));
    }, [selectedSize]);

    const handleSave = async () => {
        if (!formData.name || !currentUser) return;

        try {
            const dimensions = BOX_SIZES[selectedSize];

            if (isEditing) {
                const updates = {
                    name: formData.name,
                    sku: formData.sku,
                    category: formData.category,
                    labelColor: formData.labelColor,
                    itemsPerBox: Number(formData.itemsPerBox),
                    pricePerItem: Number(formData.pricePerItem),
                    totalBoxesStock: Number(formData.totalBoxesStock),
                    boxDimensions: dimensions
                };

                await updateInventoryInDb(isEditing, updates);
                updateInventoryProduct(isEditing, updates);
            } else {
                const newProductData: Omit<InventoryProduct, 'id'> = {
                    userId: currentUser.uid, // Use real user ID
                    name: formData.name!,
                    sku: formData.sku || `SKU-${Date.now()}`,
                    category: formData.category || 'General',
                    labelColor: formData.labelColor || '#3B82F6',
                    itemsPerBox: Number(formData.itemsPerBox) || 12,
                    pricePerItem: Number(formData.pricePerItem) || 0,
                    totalBoxesStock: Number(formData.totalBoxesStock) || 0,
                    boxDimensions: dimensions
                };

                const newId = await createInventoryProduct(newProductData);
                addInventoryProduct({ ...newProductData, id: newId });
            }
            resetForm();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product. Check console.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await deleteInventoryInDb(id);
            deleteInventoryProduct(id);
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const resetForm = () => {
        setIsEditing(null);
        setShowAddForm(false);
        setSelectedSize('medium');
        setFormData({
            name: '',
            sku: '',
            category: 'General',
            labelColor: '#3B82F6',
            itemsPerBox: 12,
            pricePerItem: 0,
            totalBoxesStock: 100,
            boxDimensions: BOX_SIZES.medium
        });
    };

    const startEdit = (product: InventoryProduct) => {
        setFormData(product);
        // Determine size key from dimensions
        const dims = product.boxDimensions;
        if (dims.width <= 0.15) setSelectedSize('small');
        else if (dims.width <= 0.25) setSelectedSize('medium');
        else setSelectedSize('large');
        setIsEditing(product.id);
        setShowAddForm(true);
    };

    const getSizeLabel = (dims: { width: number; height: number; depth: number }) => {
        if (dims.width <= 0.15) return 'S';
        if (dims.width <= 0.25) return 'M';
        return 'L';
    };

    // Redirect if not logged in
    if (!isLoading && !currentUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
                    <p className="text-gray-500 mb-6">You need to be logged in to manage inventory.</p>
                    <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                        <p className="text-gray-500">Manage products, box sizes, and stock levels</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Editor
                        </button>
                        <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                            Dashboard
                        </Link>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm"
                        >
                            + Add New Product
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading inventory...</p>
                    </div>
                ) : (
                    <>
                        {/* Add/Edit Form */}
                        {showAddForm && (
                            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100 animate-in fade-in slide-in-from-top-4">
                                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Product' : 'New Product Definition'}</h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left: Form Fields */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Product Details</h3>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Product Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g., Organic Pasta"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">SKU</label>
                                                <input
                                                    type="text"
                                                    value={formData.sku}
                                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                                    className="w-full p-2 border rounded"
                                                    placeholder="AUTO"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Price per Item ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.pricePerItem || ''}
                                                    onChange={e => setFormData({ ...formData, pricePerItem: parseFloat(e.target.value) || 0 })}
                                                    className="w-full p-2 border rounded"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Items per Box</label>
                                                <input
                                                    type="number"
                                                    value={formData.itemsPerBox || ''}
                                                    onChange={e => setFormData({ ...formData, itemsPerBox: parseInt(e.target.value) || 0 })}
                                                    className="w-full p-2 border rounded"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Total Stock (Boxes)</label>
                                                <input
                                                    type="number"
                                                    value={formData.totalBoxesStock || ''}
                                                    onChange={e => setFormData({ ...formData, totalBoxesStock: parseInt(e.target.value) || 0 })}
                                                    className="w-full p-2 border rounded"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Label Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={formData.labelColor}
                                                    onChange={e => setFormData({ ...formData, labelColor: e.target.value })}
                                                    className="h-10 w-20 rounded cursor-pointer"
                                                />
                                                <span className="text-sm text-gray-500">{formData.labelColor}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Box Size Selection with 3D Preview */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Box Size</h3>

                                        {/* Size Buttons */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {(Object.keys(BOX_SIZES) as BoxSizeKey[]).map((key) => {
                                                const size = BOX_SIZES[key];
                                                const isSelected = selectedSize === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => setSelectedSize(key)}
                                                        className={`p-4 rounded-xl border-2 transition-all text-center ${isSelected
                                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                            }`}
                                                    >
                                                        <div className={`text-2xl font-bold ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                                                            {key.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-600 capitalize">{size.label}</div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {(size.width * 100).toFixed(0)}×{(size.height * 100).toFixed(0)}×{(size.depth * 100).toFixed(0)}cm
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* 3D Preview */}
                                        <div className="relative">
                                            <BoxPreview3D sizeKey={selectedSize} color={formData.labelColor || '#3B82F6'} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                    <button onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700">
                                        {isEditing ? 'Update Product' : 'Create Product'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Inventory List */}
                        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Product</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Size</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Cost</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Items/Box</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Total Boxes</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventory.map(item => (
                                        <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded border" style={{ backgroundColor: item.labelColor }}></div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{item.name}</div>
                                                        <div className="text-xs text-gray-500">{item.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getSizeLabel(item.boxDimensions) === 'S' ? 'bg-green-100 text-green-700' :
                                                    getSizeLabel(item.boxDimensions) === 'M' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {getSizeLabel(item.boxDimensions)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium">${item.pricePerItem.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">per item</div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {item.itemsPerBox} units
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.totalBoxesStock > 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {item.totalBoxesStock} boxes
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => startEdit(item)} className="text-blue-600 hover:underline text-sm">Edit</button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                No products in inventory. Click "Add New Product" to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
