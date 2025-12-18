'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/auth';
import { getUserStores, createStore, deleteStore } from '@/lib/db';
import { Store } from '@/types';
import StoreCard from '@/components/StoreCard';
import CreateStoreModal from '@/components/CreateStoreModal';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);
            await loadStores(currentUser.uid);
        } catch (error) {
            console.error('Auth error:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const loadStores = async (userId: string) => {
        try {
            const userStores = await getUserStores(userId);
            setStores(userStores);
        } catch (error: any) {
            console.error('Error loading stores:', error);
        }
    };

    const handleCreateStore = async (storeData: {
        name: string;
        description: string;
        color: string;
        width: number;
        depth: number;
    }) => {
        if (!user) return;

        setCreating(true);
        try {
            const storeId = await createStore(user.uid, storeData);
            setIsModalOpen(false);
            await loadStores(user.uid);
            // Redirect to editor
            router.push(`/editor/${storeId}`);
        } catch (error: any) {
            alert(error.message || 'Failed to create store');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteStore = async (storeId: string) => {
        try {
            await deleteStore(storeId);
            setStores(stores.filter((s) => s.id !== storeId));
        } catch (error: any) {
            alert(error.message || 'Failed to delete store');
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Stores</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Welcome back, {user?.displayName || 'User'}!
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
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
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                New Store
                            </button>

                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {stores.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-20">
                        <div className="inline-block p-6 bg-white rounded-full shadow-lg mb-6">
                            <svg
                                className="w-16 h-16 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No stores yet</h2>
                        <p className="text-gray-600 mb-6">
                            Get started by creating your first store!
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
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
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                            Create Your First Store
                        </button>
                    </div>
                ) : (
                    /* Store Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stores.map((store) => (
                            <StoreCard key={store.id} store={store} onDelete={handleDeleteStore} />
                        ))}
                    </div>
                )}
            </main>

            {/* Create Store Modal */}
            <CreateStoreModal
                isOpen={isModalOpen}
                onClose={() => !creating && setIsModalOpen(false)}
                onCreate={handleCreateStore}
            />
        </div>
    );
}
