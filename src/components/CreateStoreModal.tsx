'use client';

import { useState, FormEvent } from 'react';
import ColorPicker from './ColorPicker';
import { STORE_COLORS } from '@/lib/constants';

interface CreateStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (store: { name: string; description: string; color: string; width: number; depth: number }) => void;
}

export default function CreateStoreModal({ isOpen, onClose, onCreate }: CreateStoreModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(STORE_COLORS[0].hex);
    const [width, setWidth] = useState(100);
    const [depth, setDepth] = useState(100);

    if (!isOpen) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Please enter a store name');
            return;
        }

        onCreate({
            name: name.trim(),
            description: description.trim(),
            color,
            width,
            depth,
        });

        // Reset form
        setName('');
        setDescription('');
        setColor(STORE_COLORS[0].hex);
        setWidth(100);
        setDepth(100);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Create New Store</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Store Name */}
                    <div>
                        <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700 mb-2">
                            Store Name *
                        </label>
                        <input
                            id="storeName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Downtown Store"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a brief description..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Color Picker */}
                    <ColorPicker selectedColor={color} onColorChange={setColor} />

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="width" className="block text-sm font-semibold text-gray-700 mb-2">
                                Width (m)
                            </label>
                            <input
                                id="width"
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(Number(e.target.value))}
                                min="10"
                                max="500"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="depth" className="block text-sm font-semibold text-gray-700 mb-2">
                                Depth (m)
                            </label>
                            <input
                                id="depth"
                                type="number"
                                value={depth}
                                onChange={(e) => setDepth(Number(e.target.value))}
                                min="10"
                                max="500"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                        >
                            Create Store
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
