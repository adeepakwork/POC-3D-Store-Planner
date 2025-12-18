'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStore, getStoreAisles } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Store } from '@/types';
import Canvas2DEditor from '@/components/Canvas2DEditor';
import Scene3DView from '@/components/Scene3DView';
import AislePropertiesPanel from '@/components/AislePropertiesPanel';
import EditorSidebar from '@/components/EditorSidebar';
import useStore from '@/stores/useStore';

export default function EditorPage({ params }: { params: Promise<{ storeId: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<Store | null>(null);
    const [error, setError] = useState('');

    // Unwrap params Promise (Next.js 15)
    const { storeId } = use(params);

    const { viewMode, setViewMode, setCurrentStore, setAisles } = useStore();

    useEffect(() => {
        loadStoreData();
    }, [storeId]);

    const loadStoreData = async () => {
        try {
            // Check auth
            const user = await getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Load store from Firestore
            const storeData = await getStore(storeId);
            if (!storeData) {
                setError('Store not found');
                setLoading(false);
                return;
            }

            // Check if user owns this store
            if (storeData.userId !== user.uid) {
                setError('You do not have permission to edit this store');
                setLoading(false);
                return;
            }

            setStore(storeData);

            // Load aisles separately
            const aisles = await getStoreAisles(storeId);

            // Load into Zustand store
            setCurrentStore(storeData);
            setAisles(aisles);

            setLoading(false);
        } catch (err: any) {
            console.error('Error loading store:', err);
            setError(err.message || 'Failed to load store');
            setLoading(false);
        }
    };

    const handleBackToDashboard = () => {
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading store...</p>
                </div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="mb-6">
                        <svg
                            className="w-16 h-16 text-red-500 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{error || 'Error'}</h2>
                    <p className="text-gray-600 mb-6">Unable to load this store</p>
                    <button
                        onClick={handleBackToDashboard}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackToDashboard}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Dashboard"
                    >
                        <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div>
                        <div className="font-bold text-xl text-gray-800">{store.name}</div>
                        {store.description && (
                            <div className="text-xs text-gray-500">{store.description}</div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('2d')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${viewMode === '2d'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        2D Blueprint
                    </button>
                    <button
                        onClick={() => setViewMode('3d')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${viewMode === '3d'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        3D Walkthrough
                    </button>
                    <div className="w-px bg-gray-300 mx-1"></div>
                    <button
                        onClick={() => router.push('/inventory')}
                        className="px-4 py-2 rounded-lg font-semibold transition-all bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                        📦 Inventory
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <EditorSidebar currentStoreId={store.id} />

                {/* Viewport */}
                <div className="flex-1 relative bg-gray-200">
                    {viewMode === '2d' ? <Canvas2DEditor /> : <Scene3DView />}
                </div>

                {/* Right Sidebar - Only show in 2D mode */}
                {viewMode === '2d' && <AislePropertiesPanel />}
            </div>
        </div>
    );
}
