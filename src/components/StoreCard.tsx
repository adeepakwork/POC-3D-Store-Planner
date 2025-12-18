'use client';

import { useRouter } from 'next/navigation';
import { Store } from '@/types';

interface StoreCardProps {
    store: Store;
    onDelete: (storeId: string) => void;
}

export default function StoreCard({ store, onDelete }: StoreCardProps) {
    const router = useRouter();

    const handleOpen = () => {
        router.push(`/editor/${store.id}`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete "${store.name}"? This action cannot be undone.`)) {
            onDelete(store.id);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div
            className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border-2 hover:border-gray-300"
            style={{ borderTopColor: store.color, borderTopWidth: '6px' }}
        >
            {/* Color accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: store.color }}
            />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1" onClick={handleOpen}>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {store.name}
                        </h3>
                        {store.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{store.description}</p>
                        )}
                    </div>

                    {/* Delete button */}
                    <button
                        onClick={handleDelete}
                        className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete store"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4" onClick={handleOpen}>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">Width</p>
                        <p className="text-xl font-bold text-gray-900">{store.width}m</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">Depth</p>
                        <p className="text-xl font-bold text-gray-900">{store.depth}m</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                        Updated {formatDate(store.updatedAt)}
                    </span>

                    <button
                        onClick={handleOpen}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                        Open
                    </button>
                </div>
            </div>
        </div>
    );
}
