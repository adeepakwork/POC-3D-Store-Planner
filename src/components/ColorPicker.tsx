'use client';

import { useState } from 'react';
import { STORE_COLORS } from '@/lib/constants';

interface ColorPickerProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
}

export default function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
    const [customColor, setCustomColor] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handleCustomColorSubmit = () => {
        if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
            onColorChange(customColor);
            setShowCustom(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Store Color</label>

            {/* Color Grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
                {STORE_COLORS.map((color) => (
                    <button
                        key={color.hex}
                        type="button"
                        onClick={() => onColorChange(color.hex)}
                        className={`h-12 rounded-lg transition-all hover:scale-110 ${selectedColor === color.hex
                                ? 'ring-4 ring-offset-2 ring-blue-500 scale-105'
                                : 'hover:ring-2 hover:ring-gray-300'
                            }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                    />
                ))}
            </div>

            {/* Custom Color Option */}
            {!showCustom ? (
                <button
                    type="button"
                    onClick={() => setShowCustom(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                    + Use custom color
                </button>
            ) : (
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value.toUpperCase())}
                        placeholder="#RRGGBB"
                        maxLength={7}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={handleCustomColorSubmit}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowCustom(false);
                            setCustomColor('');
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Selected Color Preview */}
            <div className="mt-3 flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-lg border-2 border-gray-300"
                    style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm text-gray-600">Selected: {selectedColor}</span>
            </div>
        </div>
    );
}
