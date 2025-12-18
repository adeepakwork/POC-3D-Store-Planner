'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// Box Size Presets
export const BOX_SIZES = {
    small: { width: 0.15, height: 0.15, depth: 0.10, label: 'Small' },
    medium: { width: 0.25, height: 0.25, depth: 0.15, label: 'Medium' },
    large: { width: 0.40, height: 0.35, depth: 0.25, label: 'Large' },
};

export type BoxSizeKey = keyof typeof BOX_SIZES;

interface BoxPreview3DProps {
    sizeKey: BoxSizeKey;
    color: string;
}

function MeasurementLine({ start, end, label, offset = [0, 0, 0] }: { start: [number, number, number], end: [number, number, number], label: string, offset?: [number, number, number] }) {
    const midPoint: [number, number, number] = [
        (start[0] + end[0]) / 2 + offset[0],
        (start[1] + end[1]) / 2 + offset[1],
        (start[2] + end[2]) / 2 + offset[2],
    ];

    const positions = new Float32Array([...start, ...end]);

    return (
        <group>
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#ef4444" linewidth={2} />
            </line>
            <Html position={midPoint} center>
                <div className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-bold shadow whitespace-nowrap">
                    {label}
                </div>
            </Html>
        </group>
    );
}

function ShelfWithBox({ size, color }: { size: typeof BOX_SIZES.small, color: string }) {
    const shelfWidth = 1.0;
    const shelfDepth = 0.5;
    const shelfThickness = 0.02;
    const shelfY = 0;

    const boxY = shelfY + shelfThickness / 2 + size.height / 2;

    return (
        <group>
            {/* Shelf */}
            <mesh position={[0, shelfY, 0]} receiveShadow>
                <boxGeometry args={[shelfWidth, shelfThickness, shelfDepth]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>

            {/* Shelf Supports */}
            <mesh position={[-shelfWidth / 2 + 0.02, shelfY - 0.15, 0]}>
                <boxGeometry args={[0.04, 0.3, shelfDepth]} />
                <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[shelfWidth / 2 - 0.02, shelfY - 0.15, 0]}>
                <boxGeometry args={[0.04, 0.3, shelfDepth]} />
                <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* Product Box */}
            <mesh position={[0, boxY, 0]} castShadow>
                <boxGeometry args={[size.width, size.height, size.depth]} />
                <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>

            {/* Measurement Lines */}
            {/* Width (X axis) */}
            <MeasurementLine
                start={[-size.width / 2, boxY - size.height / 2 - 0.05, size.depth / 2 + 0.05]}
                end={[size.width / 2, boxY - size.height / 2 - 0.05, size.depth / 2 + 0.05]}
                label={`${(size.width * 100).toFixed(0)}cm`}
            />

            {/* Height (Y axis) */}
            <MeasurementLine
                start={[size.width / 2 + 0.05, boxY - size.height / 2, size.depth / 2 + 0.05]}
                end={[size.width / 2 + 0.05, boxY + size.height / 2, size.depth / 2 + 0.05]}
                label={`${(size.height * 100).toFixed(0)}cm`}
            />

            {/* Depth (Z axis) */}
            <MeasurementLine
                start={[-size.width / 2 - 0.05, boxY - size.height / 2 - 0.05, -size.depth / 2]}
                end={[-size.width / 2 - 0.05, boxY - size.height / 2 - 0.05, size.depth / 2]}
                label={`${(size.depth * 100).toFixed(0)}cm`}
            />
        </group>
    );
}

export default function BoxPreview3D({ sizeKey, color }: BoxPreview3DProps) {
    const size = BOX_SIZES[sizeKey];

    return (
        <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-inner">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0.8, 0.5, 0.8]} fov={40} />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
                <ShelfWithBox size={size} color={color} />
                <gridHelper args={[2, 20, '#cbd5e1', '#e2e8f0']} position={[0, -0.3, 0]} />
            </Canvas>
            <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1.5 rounded-lg shadow text-sm font-bold text-slate-700">
                {size.label} Box
            </div>
        </div>
    );
}
