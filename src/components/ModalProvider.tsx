'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
}

interface ModalContextType {
    confirm: (options: ModalOptions) => Promise<boolean>;
    alert: (options: Omit<ModalOptions, 'cancelText'>) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ModalOptions | null>(null);
    const [isConfirmMode, setIsConfirmMode] = useState(true);
    const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

    const confirm = (opts: ModalOptions): Promise<boolean> => {
        return new Promise((res) => {
            setOptions(opts);
            setIsConfirmMode(true);
            setIsOpen(true);
            setResolve(() => res);
        });
    };

    const alert = (opts: Omit<ModalOptions, 'cancelText'>): Promise<void> => {
        return new Promise((res) => {
            setOptions({ ...opts, cancelText: undefined });
            setIsConfirmMode(false);
            setIsOpen(true);
            setResolve(() => () => res());
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        resolve?.(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolve?.(false);
    };

    const getTypeStyles = () => {
        switch (options?.type) {
            case 'danger':
                return {
                    icon: (
                        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    ),
                    confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                    headerBg: 'bg-gradient-to-r from-red-500 to-red-600',
                };
            case 'warning':
                return {
                    icon: (
                        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
                    headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
                };
            default:
                return {
                    icon: (
                        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <ModalContext.Provider value={{ confirm, alert }}>
            {children}

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={handleCancel}
                    />

                    {/* Modal */}
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Icon Header */}
                            <div className="flex justify-center pt-8 pb-4">
                                <div className="p-4 bg-gray-50 rounded-full">
                                    {styles.icon}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-8 pb-6 text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {options?.title}
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {options?.message}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="px-8 pb-8 flex gap-3">
                                {isConfirmMode && (
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    >
                                        {options?.cancelText || 'Cancel'}
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmBtn}`}
                                >
                                    {options?.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}
