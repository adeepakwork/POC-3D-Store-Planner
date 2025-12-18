'use client';

import { useState } from 'react';
import useStore from '@/stores/useStore';
import Link from 'next/link';
import { Aisle } from '@/types';

interface SidebarProps {
    currentStoreId: string | null;
}

type PanelType = 'layers' | 'properties' | 'settings' | null;

export default function EditorSidebar({ currentStoreId }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activePanel, setActivePanel] = useState<PanelType>('layers');

    const togglePanel = (panel: PanelType) => {
        if (activePanel === panel) {
            setActivePanel(null);
        } else {
            setActivePanel(panel);
            if (isCollapsed) setIsCollapsed(false);
        }
    };

    return (
        <div className="flex h-full border-r border-gray-200">
            {/* Icon Bar */}
            <div className="w-12 bg-gray-800 flex flex-col items-center py-4 space-y-2 flex-shrink-0">
                {/* Layers */}
                <button
                    onClick={() => togglePanel('layers')}
                    className={`p-2 rounded-lg transition-colors ${activePanel === 'layers' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    title="Layers"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                </button>

                {/* Properties */}
                <button
                    onClick={() => togglePanel('properties')}
                    className={`p-2 rounded-lg transition-colors ${activePanel === 'properties' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    title="Properties"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </button>

                {/* Settings */}
                <button
                    onClick={() => togglePanel('settings')}
                    className={`p-2 rounded-lg transition-colors ${activePanel === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    title="Settings"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                {/* Inventory Link */}
                <Link
                    href="/inventory"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Manage Inventory"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </Link>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Collapse/Expand Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
                    </svg>
                </button>
            </div>

            {/* Panel Content */}
            {!isCollapsed && activePanel && (
                <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                    {/* Panel Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 capitalize">{activePanel}</h3>
                        <button
                            onClick={() => setActivePanel(null)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Panel Body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activePanel === 'layers' && <LayersPanel />}
                        {activePanel === 'properties' && <PropertiesPanel />}
                        {activePanel === 'settings' && <SettingsPanel />}
                    </div>
                </div>
            )}
        </div>
    );
}

// Layers Panel - Shows all aisles with selection
function LayersPanel() {
    const getCurrentAisles = useStore((state) => state.getCurrentAisles);
    const selectedAisleId = useStore((state) => state.selectedAisleId);
    const setSelectedAisle = useStore((state) => state.setSelectedAisle);
    const aisles = getCurrentAisles();

    return (
        <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-3">
                Aisles in your store ({aisles.length})
            </div>

            {aisles.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6">
                    No aisles yet. Draw on the canvas to create one.
                </div>
            ) : (
                <div className="space-y-1">
                    {aisles.map((aisle) => (
                        <div
                            key={aisle.id}
                            onClick={() => setSelectedAisle(aisle.id)}
                            className={`p-2 rounded flex items-center justify-between cursor-pointer transition-colors ${selectedAisleId === aisle.id
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg className={`w-4 h-4 ${selectedAisleId === aisle.id ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                                <span className={`text-sm font-medium ${selectedAisleId === aisle.id ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {aisle.name}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">
                                {aisle.width}×{aisle.length}m
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-3 border-t border-gray-100 mt-3">
                <p className="text-xs text-gray-400">
                    Tip: Draw on canvas to add aisles
                </p>
            </div>
        </div>
    );
}

// Properties Panel - Shows selected aisle properties
function PropertiesPanel() {
    const getSelectedAisle = useStore((state) => state.getSelectedAisle);
    const selectedAisle = getSelectedAisle();

    if (!selectedAisle) {
        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-500 text-center py-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Select an aisle to view its properties
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="font-medium text-gray-900">{selectedAisle.name}</div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Width</div>
                    <div className="font-medium">{selectedAisle.width}m</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Length</div>
                    <div className="font-medium">{selectedAisle.length}m</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Height</div>
                    <div className="font-medium">{selectedAisle.height}m</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Shelves</div>
                    <div className="font-medium">{selectedAisle.shelves}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Position X</div>
                    <div className="font-medium">{selectedAisle.x}m</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500 text-xs">Position Z</div>
                    <div className="font-medium">{selectedAisle.z}m</div>
                </div>
            </div>

            <p className="text-xs text-gray-400 pt-2">
                Use the right panel to edit properties
            </p>
        </div>
    );
}

// Settings Panel - Grid and snap settings
function SettingsPanel() {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grid</label>
                <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Show grid</span>
                </label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Snap to Grid</label>
                <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Enable snapping</span>
                </label>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Units</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    <option>Meters</option>
                    <option>Feet</option>
                </select>
            </div>
        </div>
    );
}
