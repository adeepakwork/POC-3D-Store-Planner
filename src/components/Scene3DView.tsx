'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '@/stores/useStore';
import { Aisle, AisleProduct, InventoryProduct, PlacedBox } from '@/types';
import { X as CloseIcon, Move, Hand, RotateCcw, ZoomIn, ZoomOut, Undo2 } from 'lucide-react';

// Constants matching reference file
const RACK_COLOR = '#1e3a8a';      // Blue steel
const BEAM_COLOR = '#d97706';      // Orange/amber beams
const STATIC_BOX_COLOR = '#a67c52'; // Cardboard brown
const POST_SIZE = 0.15;            // Size of vertical posts
const SHELF_THICKNESS = 0.08;      // Thickness of shelf platforms
const BOX_GAP = 0.05;              // Gap between boxes

// Create ESL (Electronic Shelf Label) texture with product info
function createESLTexture(product: InventoryProduct, quantity: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 128);

    // Border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 124);

    // Product name (truncated)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    const name = product.name.length > 12 ? product.name.substring(0, 11) + '…' : product.name;
    ctx.fillText(name, 10, 28);

    // SKU
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText(product.sku || 'N/A', 10, 48);

    // Price - large and prominent
    ctx.fillStyle = '#16a34a'; // Green
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`$${product.pricePerItem.toFixed(2)}`, 10, 85);

    // Quantity badge
    ctx.fillStyle = product.labelColor || '#3B82F6';
    ctx.beginPath();
    ctx.roundRect(180, 55, 65, 35, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`×${quantity}`, 212, 80);

    // Items per box
    ctx.fillStyle = '#888888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${product.itemsPerBox} items/box`, 10, 118);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Create rack unit with proper 4 corner posts and shelf beams
function RackUnit({
    width,
    depth,
    height,
    levels,
    position,
    boxes,
    onBoxClick
}: {
    width: number;
    depth: number;
    height: number;
    levels: number;
    position: [number, number, number];
    boxes: { shelfLevel: number; boxData: BoxData[] }[];
    onBoxClick?: (boxData: BoxData) => void;
}) {
    const levelHeight = height / levels;
    const halfW = width / 2;
    const halfD = depth / 2;
    const halfH = height / 2;

    // 4 corner posts positions
    const postPositions: [number, number, number][] = [
        [-halfW + POST_SIZE / 2, halfH, -halfD + POST_SIZE / 2],
        [halfW - POST_SIZE / 2, halfH, -halfD + POST_SIZE / 2],
        [-halfW + POST_SIZE / 2, halfH, halfD - POST_SIZE / 2],
        [halfW - POST_SIZE / 2, halfH, halfD - POST_SIZE / 2],
    ];

    return (
        <group position={position}>
            {/* 4 Vertical Posts */}
            {postPositions.map((pos, idx) => (
                <mesh key={`post-${idx}`} position={pos} castShadow receiveShadow>
                    <boxGeometry args={[POST_SIZE, height, POST_SIZE]} />
                    <meshStandardMaterial color={RACK_COLOR} metalness={0.6} roughness={0.4} />
                </mesh>
            ))}

            {/* Horizontal Beams for each level */}
            {Array.from({ length: levels }).map((_, i) => {
                const y = (i + 1) * levelHeight;
                const shelfBoxes = boxes.find(b => b.shelfLevel === i + 1)?.boxData || [];

                return (
                    <group key={`level-${i}`}>
                        {/* Front horizontal beam */}
                        <mesh position={[0, y - SHELF_THICKNESS / 2, -halfD + POST_SIZE / 2]} castShadow>
                            <boxGeometry args={[width - POST_SIZE * 2, SHELF_THICKNESS, POST_SIZE]} />
                            <meshStandardMaterial color={BEAM_COLOR} />
                        </mesh>
                        {/* Back horizontal beam */}
                        <mesh position={[0, y - SHELF_THICKNESS / 2, halfD - POST_SIZE / 2]} castShadow>
                            <boxGeometry args={[width - POST_SIZE * 2, SHELF_THICKNESS, POST_SIZE]} />
                            <meshStandardMaterial color={BEAM_COLOR} />
                        </mesh>
                        {/* Left side beam */}
                        <mesh position={[-halfW + POST_SIZE / 2, y - SHELF_THICKNESS / 2, 0]} castShadow>
                            <boxGeometry args={[POST_SIZE, SHELF_THICKNESS, depth - POST_SIZE * 2]} />
                            <meshStandardMaterial color={BEAM_COLOR} />
                        </mesh>
                        {/* Right side beam */}
                        <mesh position={[halfW - POST_SIZE / 2, y - SHELF_THICKNESS / 2, 0]} castShadow>
                            <boxGeometry args={[POST_SIZE, SHELF_THICKNESS, depth - POST_SIZE * 2]} />
                            <meshStandardMaterial color={BEAM_COLOR} />
                        </mesh>

                        {/* Shelf platform - thin plywood style */}
                        <mesh position={[0, y - 0.01, 0]} receiveShadow>
                            <boxGeometry args={[width - POST_SIZE * 2 - 0.02, 0.03, depth - POST_SIZE * 2 - 0.02]} />
                            <meshStandardMaterial color="#666666" roughness={0.9} />
                        </mesh>

                        {/* Boxes on this shelf */}
                        {shelfBoxes.map((box, bIdx) => (
                            <group
                                key={`box-${bIdx}`}
                                position={[box.x, y + box.height / 2 + 0.03, box.z]}
                                userData={{ boxData: box }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBoxClick?.(box);
                                }}
                                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                            >
                                {/* Box mesh */}
                                <mesh userData={{ boxData: box }}>
                                    <boxGeometry args={[box.width * 0.95, box.height, box.depth * 0.95]} />
                                    <meshStandardMaterial color={STATIC_BOX_COLOR} roughness={0.7} />
                                </mesh>

                                {/* Label stripe on front face (facing -Z direction, toward walkway) */}
                                <mesh position={[0, box.height * 0.2, -(box.depth * 0.95) / 2 - 0.002]}>
                                    <planeGeometry args={[box.width * 0.85, box.height * 0.3]} />
                                    <meshBasicMaterial
                                        color={box.labelColor}
                                        side={THREE.DoubleSide}
                                    />
                                </mesh>
                            </group>
                        ))}

                        {/* ESL Price Tags - one per unique product on the shelf edge */}
                        {(() => {
                            const seenProducts = new Set<string>();
                            return shelfBoxes.filter(box => {
                                if (seenProducts.has(box.productId)) return false;
                                seenProducts.add(box.productId);
                                return true;
                            }).map((box, eslIdx) => {
                                const eslTexture = createESLTexture(box.product, box.quantity);
                                return (
                                    <group
                                        key={`esl-${eslIdx}`}
                                        position={[box.x, y - 0.15, -(depth / 2) - 0.02]}
                                        rotation={[0, Math.PI, 0]}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBoxClick?.(box);
                                        }}
                                        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                                        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                                    >
                                        {/* ESL with texture - rotated to face viewer */}
                                        <mesh>
                                            <planeGeometry args={[0.6, 0.3]} />
                                            <meshBasicMaterial map={eslTexture} side={THREE.FrontSide} />
                                        </mesh>
                                    </group>
                                );
                            });
                        })()}
                    </group>
                );
            })}
        </group>
    );
}

// Box data type
type BoxData = {
    x: number;
    z: number;
    width: number;
    height: number;
    depth: number;
    labelColor: string;
    productId: string;
    product: InventoryProduct;
    quantity: number; // Total quantity for this product on this shelf
};

// Generate boxes for a shelf based on products
function generateBoxesForShelf(
    shelfWidth: number,
    shelfDepth: number,
    products: AisleProduct[],
    inventoryMap: Record<string, InventoryProduct>
): BoxData[] {
    const boxes: BoxData[] = [];

    // Start position for placing boxes
    const startX = -shelfWidth / 2 + POST_SIZE + 0.1;
    const startZ = -shelfDepth / 2 + POST_SIZE + 0.1;
    const usableWidth = shelfWidth - POST_SIZE * 2 - 0.2;
    const usableDepth = shelfDepth - POST_SIZE * 2 - 0.2;

    let cursorX = startX;
    let cursorZ = startZ;

    for (const prod of products) {
        const invItem = inventoryMap[prod.productId];
        if (!invItem) continue;

        // Get box dimensions with defaults
        const dims = invItem.boxDimensions || { width: 0.25, height: 0.2, depth: 0.2 };
        const boxW = dims.width || 0.25;
        const boxH = dims.height || 0.2;
        const boxD = dims.depth || 0.2;
        const labelColor = invItem.labelColor || '#3B82F6';

        // Use inventory totalBoxesStock (actual stock) instead of aisle placement quantity
        const boxCount = invItem.totalBoxesStock || 1;

        // Place the specified number of boxes based on stock
        for (let i = 0; i < boxCount; i++) {
            // Check if we have space in current row
            if (cursorX + boxW > shelfWidth / 2 - POST_SIZE - 0.1) {
                // Move to next row
                cursorX = startX;
                cursorZ += boxD + BOX_GAP;
            }

            // Check if we exceeded depth
            if (cursorZ + boxD > shelfDepth / 2 - POST_SIZE - 0.1) {
                break; // Shelf is full
            }

            boxes.push({
                x: cursorX + boxW / 2,
                z: cursorZ + boxD / 2,
                width: boxW,
                height: boxH,
                depth: boxD,
                labelColor,
                productId: prod.productId,
                product: invItem,
                quantity: boxCount // Now uses inventory stock
            });

            cursorX += boxW + BOX_GAP;
        }
    }

    return boxes;
}

// Store Building Component - Walls, Roof, Door
function StoreBuilding({ width, depth, height = 8, storeName = 'STORE', storeColor = '#3B82F6' }: {
    width: number;
    depth: number;
    height?: number;
    storeName?: string;
    storeColor?: string;
}) {
    const wallThickness = 0.3;
    const wallColor = '#e2e8f0';      // Light gray walls (bright!)
    const interiorWallColor = '#f8fafc';  // Even lighter inside
    const doorWidth = 4;
    const doorHeight = 3.5;

    // Center the store around origin
    const halfW = width / 2;
    const halfD = depth / 2;

    // Calculate ceiling light grid
    const lightSpacingX = 8;
    const lightSpacingZ = 8;
    const numLightsX = Math.max(2, Math.floor(width / lightSpacingX));
    const numLightsZ = Math.max(2, Math.floor(depth / lightSpacingZ));

    const lights: { x: number; z: number }[] = [];
    for (let i = 0; i < numLightsX; i++) {
        for (let j = 0; j < numLightsZ; j++) {
            lights.push({
                x: (i + 0.5) * (width / numLightsX),
                z: (j + 0.5) * (depth / numLightsZ)
            });
        }
    }

    return (
        <group>
            {/* Store Floor (bright supermarket floor) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[halfW, 0.01, halfD]}>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
            </mesh>

            {/* Interior Ceiling Lights (bright fluorescent) */}
            {lights.map((light, idx) => (
                <group key={idx} position={[light.x, height - 0.5, light.z]}>
                    {/* Light fixture */}
                    <mesh>
                        <boxGeometry args={[1.5, 0.1, 0.5]} />
                        <meshBasicMaterial color="#ffffff" />
                    </mesh>
                    {/* Point light for illumination */}
                    <pointLight intensity={2} distance={15} decay={2} color="#fff5e6" />
                </group>
            ))}

            {/* Back Wall (full) */}
            <mesh position={[halfW, height / 2, depth + wallThickness / 2]}>
                <boxGeometry args={[width + wallThickness * 2, height, wallThickness]} />
                <meshStandardMaterial color={interiorWallColor} />
            </mesh>

            {/* Left Wall (full) */}
            <mesh position={[-wallThickness / 2, height / 2, halfD]}>
                <boxGeometry args={[wallThickness, height, depth]} />
                <meshStandardMaterial color={interiorWallColor} />
            </mesh>

            {/* Right Wall (full) */}
            <mesh position={[width + wallThickness / 2, height / 2, halfD]}>
                <boxGeometry args={[wallThickness, height, depth]} />
                <meshStandardMaterial color={interiorWallColor} />
            </mesh>

            {/* Front Wall - Left section (beside door) */}
            <mesh position={[(halfW - doorWidth / 2) / 2, height / 2, -wallThickness / 2]}>
                <boxGeometry args={[(halfW - doorWidth / 2), height, wallThickness]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Front Wall - Right section (beside door) */}
            <mesh position={[width - (halfW - doorWidth / 2) / 2, height / 2, -wallThickness / 2]}>
                <boxGeometry args={[(halfW - doorWidth / 2), height, wallThickness]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Front Wall - Above door */}
            <mesh position={[halfW, doorHeight + (height - doorHeight) / 2, -wallThickness / 2]}>
                <boxGeometry args={[doorWidth, height - doorHeight, wallThickness]} />
                <meshStandardMaterial color={wallColor} />
            </mesh>

            {/* Door Frame - Left */}
            <mesh position={[halfW - doorWidth / 2 - 0.1, doorHeight / 2, -wallThickness / 2]}>
                <boxGeometry args={[0.2, doorHeight, wallThickness + 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Door Frame - Right */}
            <mesh position={[halfW + doorWidth / 2 + 0.1, doorHeight / 2, -wallThickness / 2]}>
                <boxGeometry args={[0.2, doorHeight, wallThickness + 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Door Frame - Top */}
            <mesh position={[halfW, doorHeight + 0.1, -wallThickness / 2]}>
                <boxGeometry args={[doorWidth + 0.4, 0.2, wallThickness + 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Store Sign above door */}
            <group position={[halfW, doorHeight + 2, -wallThickness - 0.3]}>
                {/* Sign background - white/cream with colored border */}
                <mesh>
                    <boxGeometry args={[Math.max(12, storeName.length * 0.8), 2.5, 0.3]} />
                    <meshStandardMaterial color={storeColor} />
                </mesh>
                {/* Inner white panel - on front face */}
                <mesh position={[0, 0, -0.1]}>
                    <boxGeometry args={[Math.max(11, storeName.length * 0.75), 2, 0.15]} />
                    <meshStandardMaterial color="#FFFEF0" />
                </mesh>
                {/* Store name using HTML for reliable text - facing outward */}
                <Html
                    position={[0, 0, -0.25]}
                    center
                    transform
                    scale={0.4}
                    rotation={[0, Math.PI, 0]}
                    style={{ pointerEvents: 'none' }}
                >
                    <div style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        color: '#000000',
                        whiteSpace: 'nowrap',
                        fontFamily: 'Arial, sans-serif',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                    }}>
                        {storeName.toUpperCase()}
                    </div>
                </Html>
            </group>
        </group>
    );
}

// Main Aisle Component - distributes boxes across ALL shelves and rack units
function AisleRacks({ aisle, inventoryMap, onBoxClick }: {
    aisle: Aisle;
    inventoryMap: Record<string, InventoryProduct>;
    onBoxClick?: (boxData: BoxData) => void;
}) {
    // An aisle has two racks - left and right side
    const rackWidth = 3;  // Width of each rack unit
    const rackDepth = 1.5; // Depth of each rack
    const rackGap = 2;     // Gap between the two facing racks (walkway)

    // Calculate number of rack units along the aisle
    const numUnits = Math.max(1, Math.floor(aisle.length / rackWidth));

    // Generate ALL boxes for the aisle and distribute them across shelves/units
    const boxesByUnitAndLevel = useMemo(() => {
        // Calculate capacity per shelf
        const usableWidth = rackWidth - POST_SIZE * 2 - 0.2;
        const usableDepth = rackDepth - POST_SIZE * 2 - 0.2;

        // Distribution result: [unitIdx][shelfLevel] = BoxData[]
        const result: Map<number, Map<number, BoxData[]>> = new Map();

        // Initialize structure
        for (let u = 0; u < numUnits; u++) {
            result.set(u, new Map());
            for (let l = 1; l <= aisle.shelves; l++) {
                result.get(u)!.set(l, []);
            }
        }

        // Track cursor position for each shelf level (to continue where we left off)
        const shelfCursors: Map<number, { unit: number; x: number; z: number }> = new Map();
        for (let l = 1; l <= aisle.shelves; l++) {
            shelfCursors.set(l, {
                unit: 0,
                x: -rackWidth / 2 + POST_SIZE + 0.1,
                z: -rackDepth / 2 + POST_SIZE + 0.1
            });
        }

        // Place boxes for each product on their designated shelf level
        for (const prod of aisle.products) {
            const invItem = inventoryMap[prod.productId];
            if (!invItem) continue;

            const allocatedCount = prod.quantityBoxes || 0;
            const targetShelf = prod.shelfLevel || 1;

            const dims = invItem.boxDimensions || { width: 0.25, height: 0.2, depth: 0.2 };
            const boxW = dims.width || 0.25;
            const boxH = dims.height || 0.2;
            const boxD = dims.depth || 0.2;

            // Get cursor for this shelf
            const cursor = shelfCursors.get(targetShelf) || { unit: 0, x: -rackWidth / 2 + POST_SIZE + 0.1, z: -rackDepth / 2 + POST_SIZE + 0.1 };

            for (let i = 0; i < allocatedCount; i++) {
                // Check if box fits in current row
                if (cursor.x + boxW > rackWidth / 2 - POST_SIZE - 0.1) {
                    // Move to next row
                    cursor.x = -rackWidth / 2 + POST_SIZE + 0.1;
                    cursor.z += boxD + BOX_GAP;
                }

                // Check if exceeded depth (this shelf section is full)
                if (cursor.z + boxD > rackDepth / 2 - POST_SIZE - 0.1) {
                    // Move to next rack unit (same shelf level)
                    cursor.unit++;
                    cursor.x = -rackWidth / 2 + POST_SIZE + 0.1;
                    cursor.z = -rackDepth / 2 + POST_SIZE + 0.1;

                    // If all units used for this shelf, stop adding
                    if (cursor.unit >= numUnits) {
                        break;
                    }
                }

                // Place the box on the correct shelf level
                result.get(cursor.unit)!.get(targetShelf)!.push({
                    x: cursor.x + boxW / 2,
                    z: cursor.z + boxD / 2,
                    width: boxW,
                    height: boxH,
                    depth: boxD,
                    labelColor: invItem.labelColor || '#3B82F6',
                    productId: prod.productId,
                    product: invItem,
                    quantity: allocatedCount
                });

                cursor.x += boxW + BOX_GAP;
            }

            // Save cursor position for this shelf (in case another product uses same shelf)
            shelfCursors.set(targetShelf, cursor);
        }

        return result;
    }, [aisle.products, aisle.shelves, aisle.length, inventoryMap, numUnits]);

    return (
        <group position={[aisle.x, 0, aisle.z]}>
            {Array.from({ length: numUnits }).map((_, unitIdx) => {
                const unitZ = unitIdx * rackWidth + rackWidth / 2;

                // Get boxes for this unit
                const unitBoxes: { shelfLevel: number; boxData: BoxData[] }[] = [];
                const unitData = boxesByUnitAndLevel.get(unitIdx);
                if (unitData) {
                    unitData.forEach((boxes, level) => {
                        unitBoxes.push({ shelfLevel: level, boxData: boxes });
                    });
                }

                return (
                    <group key={`unit-${unitIdx}`}>
                        {/* Left Rack - boxes on this side (facing walkway) */}
                        <RackUnit
                            width={rackWidth}
                            depth={rackDepth}
                            height={aisle.height}
                            levels={aisle.shelves}
                            position={[-rackGap / 2 - rackDepth / 2, 0, unitZ]}
                            boxes={unitBoxes}
                            onBoxClick={onBoxClick}
                        />
                        {/* Right Rack - empty shelves */}
                        <RackUnit
                            width={rackWidth}
                            depth={rackDepth}
                            height={aisle.height}
                            levels={aisle.shelves}
                            position={[rackGap / 2 + rackDepth / 2, 0, unitZ]}
                            boxes={[]}
                            onBoxClick={onBoxClick}
                        />
                    </group>
                );
            })}
        </group>
    );
}

// Main Scene Component
function Scene({ onProductClick }: { onProductClick: (data: any) => void }) {
    // Use direct state access for reactivity (getter functions don't create subscriptions)
    const currentStoreId = useStore((state) => state.currentStoreId);
    const stores = useStore((state) => state.stores);
    const aisles = useStore((state) => state.aisles);
    const inventory = useStore((state) => state.inventory);

    const currentStore = stores.find(s => s.id === currentStoreId);
    const currentAisles = aisles.filter(a => a.storeId === currentStoreId);
    const storeWidth = currentStore?.width || 100;
    const storeDepth = currentStore?.depth || 100;

    // Create inventory map for quick lookup
    const inventoryMap = useMemo(() => {
        return inventory.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, InventoryProduct>);
    }, [inventory]);

    return (
        <>
            {/* Sky blue background */}
            <color attach="background" args={['#87CEEB']} />
            <fog attach="fog" args={['#87CEEB', 100, 300]} />

            {/* Sun light - bright outdoor feel */}
            <ambientLight intensity={0.8} />
            <directionalLight position={[50, 80, 30]} intensity={1.5} color="#fff5e0" />
            <directionalLight position={[-30, 40, -20]} intensity={0.4} />
            <hemisphereLight intensity={0.6} color="#87CEEB" groundColor="#3d3d3d" />

            {/* Parking Lot / Outside ground (asphalt) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[storeWidth / 2, -0.02, storeDepth / 2]}>
                <planeGeometry args={[400, 400]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
            </mesh>

            {/* Parking space lines - in front of store */}
            {Array.from({ length: 10 }).map((_, i) => (
                <mesh key={`parking-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[storeWidth / 2 - 20 + i * 4, 0.01, -15]}>
                    <planeGeometry args={[0.2, 5]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            ))}

            {/* Store Building with Walls */}
            {currentStore && (
                <StoreBuilding
                    width={currentStore.width}
                    depth={currentStore.depth}
                    storeName={currentStore.name}
                    storeColor={currentStore.color}
                />
            )}

            {/* Aisles with racks */}
            {currentAisles.map(aisle => (
                <AisleRacks
                    key={aisle.id}
                    aisle={aisle}
                    inventoryMap={inventoryMap}
                    onBoxClick={(boxData) => {
                        onProductClick({
                            product: boxData.product,
                            quantity: boxData.quantity,
                            aisleName: aisle.name,
                            aisleId: aisle.id,
                            productId: boxData.productId,
                            aisleProducts: aisle.products
                        });
                    }}
                />
            ))}
        </>
    );
}

// Product Edit Panel Component - Minimal Design
function ProductEditPanel({
    selectedProduct,
    onClose,
    onSave,
    onGrabBox,
    isWalkMode
}: {
    selectedProduct: any;
    onClose: () => void;
    onSave: (product: InventoryProduct) => Promise<void>;
    onGrabBox?: () => void;
    isWalkMode?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        pricePerItem: selectedProduct.product?.pricePerItem || 0,
        totalBoxesStock: selectedProduct.product?.totalBoxesStock || 0,
        itemsPerBox: selectedProduct.product?.itemsPerBox || 12,
        labelColor: selectedProduct.product?.labelColor || '#3B82F6'
    });

    const handleSave = async () => {
        setIsSaving(true);
        const updatedProduct = {
            ...selectedProduct.product,
            pricePerItem: parseFloat(formData.pricePerItem.toString()) || 0,
            totalBoxesStock: parseInt(formData.totalBoxesStock.toString()) || 0,
            itemsPerBox: parseInt(formData.itemsPerBox.toString()) || 12,
            labelColor: formData.labelColor
        };
        await onSave(updatedProduct);
        setIsSaving(false);
    };

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                        style={{ backgroundColor: formData.labelColor }}
                    >
                        📦
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900 text-sm">{selectedProduct.product?.name}</h2>
                        <p className="text-xs text-gray-400 font-mono">{selectedProduct.product?.sku}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <CloseIcon className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Location */}
                {selectedProduct.aisleName && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>📍</span> {selectedProduct.aisleName}
                    </div>
                )}

                {/* Edit Toggle */}
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        Edit Details
                    </button>
                )}

                {/* Form Fields */}
                <div className="space-y-3">
                    {/* Price */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Price per Item</label>
                        {isEditing ? (
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.pricePerItem}
                                    onChange={(e) => setFormData({ ...formData, pricePerItem: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-lg font-semibold focus:border-blue-400 focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-green-600">${formData.pricePerItem.toFixed(2)}</div>
                        )}
                    </div>

                    {/* Total Stock (this is what shows on shelf now) */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Total Stock (boxes)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                min="0"
                                value={formData.totalBoxesStock}
                                onChange={(e) => setFormData({ ...formData, totalBoxesStock: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg font-semibold text-amber-700 bg-amber-50 focus:border-amber-400 focus:outline-none"
                            />
                        ) : (
                            <div className="text-lg font-semibold text-amber-600">{formData.totalBoxesStock} boxes</div>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">This controls what shows on shelf</p>
                    </div>

                    {/* Items per Box */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Items per Box</label>
                        {isEditing ? (
                            <input
                                type="number"
                                value={formData.itemsPerBox}
                                onChange={(e) => setFormData({ ...formData, itemsPerBox: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                            />
                        ) : (
                            <div className="font-medium">{formData.itemsPerBox} items</div>
                        )}
                    </div>

                    {/* Label Color */}
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Label Color</label>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.labelColor}
                                    onChange={(e) => setFormData({ ...formData, labelColor: e.target.value })}
                                    className="w-10 h-8 rounded cursor-pointer border border-gray-200"
                                />
                                <input
                                    type="text"
                                    value={formData.labelColor}
                                    onChange={(e) => setFormData({ ...formData, labelColor: e.target.value })}
                                    className="flex-1 px-2 py-1 text-xs font-mono border border-gray-200 rounded"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded border border-gray-200" style={{ backgroundColor: formData.labelColor }}></div>
                                <span className="text-xs font-mono text-gray-500">{formData.labelColor}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary */}
                <div className="pt-3 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total items</span>
                        <span className="font-medium">{formData.totalBoxesStock * formData.itemsPerBox}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total value</span>
                        <span className="font-semibold text-green-600">${(formData.totalBoxesStock * formData.itemsPerBox * formData.pricePerItem).toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}

                {/* Grab & Move Button - Only in Walk Mode */}
                {isWalkMode && onGrabBox && selectedProduct.boxData && (
                    <div className="pt-3 border-t border-gray-100">
                        <button
                            onClick={() => {
                                onGrabBox();
                                onClose();
                            }}
                            className="w-full py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🖐️</span>
                            <span>Grab & Move This Box</span>
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Click to pick up, then click again to place
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// First Person Controls Component with Box Interaction
function FirstPersonControls({
    enabled,
    onSelectBox
}: {
    enabled: boolean;
    onSelectBox?: (box: BoxData | null) => void;
}) {
    const { camera, gl, scene } = useThree();
    const moveState = useRef({
        forward: false, backward: false, left: false, right: false,
        sprint: false, lookUp: false, lookDown: false, flyUp: false, flyDown: false
    });
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const isLocked = useRef(false);
    const raycaster = useRef(new THREE.Raycaster());
    const pitchRef = useRef(0);  // Track pitch for keyboard look

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': moveState.current.forward = true; break;
                case 'KeyS': case 'ArrowDown': moveState.current.backward = true; break;
                case 'KeyA': case 'ArrowLeft': moveState.current.left = true; break;
                case 'KeyD': case 'ArrowRight': moveState.current.right = true; break;
                case 'ShiftLeft': case 'ShiftRight': moveState.current.sprint = true; break;
                case 'KeyQ': moveState.current.lookUp = true; break;
                case 'KeyZ': moveState.current.lookDown = true; break;
                case 'Space': moveState.current.flyUp = true; e.preventDefault(); break;
                case 'ControlLeft': case 'ControlRight': moveState.current.flyDown = true; break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': moveState.current.forward = false; break;
                case 'KeyS': case 'ArrowDown': moveState.current.backward = false; break;
                case 'KeyA': case 'ArrowLeft': moveState.current.left = false; break;
                case 'KeyD': case 'ArrowRight': moveState.current.right = false; break;
                case 'ShiftLeft': case 'ShiftRight': moveState.current.sprint = false; break;
                case 'KeyQ': moveState.current.lookUp = false; break;
                case 'KeyZ': moveState.current.lookDown = false; break;
                case 'Space': moveState.current.flyUp = false; break;
                case 'ControlLeft': case 'ControlRight': moveState.current.flyDown = false; break;
            }
        };

        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        const PI_2 = Math.PI / 2;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isLocked.current) return;

            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            euler.setFromQuaternion(camera.quaternion);
            euler.y -= movementX * 0.003;
            euler.x -= movementY * 0.003;
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));

            camera.quaternion.setFromEuler(euler);
        };

        const handleClick = () => {
            if (!isLocked.current) {
                // Try to lock pointer, catch SecurityError if user exited lock quickly
                try {
                    gl.domElement.requestPointerLock();
                } catch (e) {
                    console.warn('Pointer lock request failed:', e);
                }
            } else {
                // Raycast to SELECT box (not grab - just show info panel)
                raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
                const intersects = raycaster.current.intersectObjects(scene.children, true);

                for (const hit of intersects) {
                    // Check if hit object has userData with box info
                    let obj = hit.object;
                    while (obj) {
                        if (obj.userData?.boxData) {
                            // SELECT the box (show panel, not grab)
                            onSelectBox?.(obj.userData.boxData);
                            return;
                        }
                        obj = obj.parent as THREE.Object3D;
                    }
                }
                // Clicked on nothing - clear selection
                onSelectBox?.(null);
            }
        };

        const handleLockChange = () => {
            isLocked.current = document.pointerLockElement === gl.domElement;
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousemove', handleMouseMove);
        gl.domElement.addEventListener('click', handleClick);
        document.addEventListener('pointerlockchange', handleLockChange);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousemove', handleMouseMove);
            gl.domElement.removeEventListener('click', handleClick);
            document.removeEventListener('pointerlockchange', handleLockChange);
            if (document.pointerLockElement === gl.domElement) {
                document.exitPointerLock();
            }
        };
    }, [enabled, camera, gl, scene, onSelectBox]);

    useFrame((_, delta) => {
        if (!enabled) return;

        // Speed: normal=8 (walking), sprint=18 (jogging)
        const speed = moveState.current.sprint ? 18 : 8;
        const damping = 12;
        const lookSpeed = 2.5;  // Radians per second for keyboard look
        const flySpeed = 5;     // Height change per second
        const collisionDistance = 0.8;  // How close we can get to walls

        // Keyboard look (Q/Z)
        if (moveState.current.lookUp || moveState.current.lookDown) {
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(camera.quaternion);

            const lookDelta = (Number(moveState.current.lookUp) - Number(moveState.current.lookDown)) * lookSpeed * delta;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x + lookDelta));

            camera.quaternion.setFromEuler(euler);
        }

        direction.current.z = Number(moveState.current.forward) - Number(moveState.current.backward);
        direction.current.x = Number(moveState.current.right) - Number(moveState.current.left);
        direction.current.normalize();

        // Get camera direction (only Y rotation for movement)
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

        // Calculate target velocity
        const targetVelocity = new THREE.Vector3();
        targetVelocity.addScaledVector(cameraDirection, direction.current.z * speed);
        targetVelocity.addScaledVector(rightVector, direction.current.x * speed);

        // Smooth interpolation for snappy but smooth feel
        velocity.current.lerp(targetVelocity, 1 - Math.exp(-damping * delta));

        // Calculate proposed new position
        const proposedMove = velocity.current.clone().multiplyScalar(delta);

        // Apply movement (no collision - walk through shelves freely)
        camera.position.addScaledVector(velocity.current, delta);

        // Fly up/down (Space/Ctrl) - height is maintained after releasing
        const flyDelta = (Number(moveState.current.flyUp) - Number(moveState.current.flyDown)) * flySpeed * delta;
        camera.position.y = Math.max(0.5, Math.min(15, camera.position.y + flyDelta));
    });

    return null;
}

// Carried Box Component - follows camera when holding an item
function CarriedBox({ box }: { box: BoxData | null }) {
    const { camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!box || !groupRef.current) return;

        // Position the box in front of the camera, slightly to the right and down
        const offset = new THREE.Vector3(0.3, -0.3, -0.6);
        offset.applyQuaternion(camera.quaternion);

        groupRef.current.position.copy(camera.position).add(offset);
        groupRef.current.quaternion.copy(camera.quaternion);

        // Add a slight bob animation
        const time = Date.now() * 0.003;
        groupRef.current.position.y += Math.sin(time) * 0.02;
    });

    if (!box) return null;

    return (
        <group ref={groupRef}>
            {/* Box mesh */}
            <mesh>
                <boxGeometry args={[box.width * 0.8, box.height * 0.8, box.depth * 0.8]} />
                <meshStandardMaterial color={STATIC_BOX_COLOR} roughness={0.7} />
            </mesh>
            {/* Label stripe */}
            <mesh position={[0, box.height * 0.1, -(box.depth * 0.8) / 2 - 0.002]}>
                <planeGeometry args={[box.width * 0.6, box.height * 0.25]} />
                <meshBasicMaterial color={box.labelColor} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Main Export Component
export default function Scene3DView() {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [controlMode, setControlMode] = useState<'orbit' | 'pan' | 'walk'>('orbit');
    const [heldBox, setHeldBox] = useState<BoxData | null>(null);
    const [pickedUpCount, setPickedUpCount] = useState(0);  // Track boxes picked up this session
    const { inventory, setInventory, updateAisle, placedBoxes, addPlacedBox, resetPlacedBoxes, getCurrentStore } = useStore();

    // Get current store for dimensions
    const currentStore = getCurrentStore();
    const storeWidth = currentStore?.width || 100;
    const storeDepth = currentStore?.depth || 100;

    // Camera starting position - at door for walk mode
    const walkStartPosition: [number, number, number] = [storeWidth / 2, 1.7, -3];  // Center of front wall, outside door
    const orbitPosition: [number, number, number] = [storeWidth / 2 + 30, 25, storeDepth / 2 + 30];

    // Load inventory on mount
    useEffect(() => {
        const initData = async () => {
            if (inventory.length === 0) {
                try {
                    const { getCurrentUser } = await import('@/lib/auth');
                    const { getUserInventory } = await import('@/lib/db');
                    const user = await getCurrentUser();
                    if (user) {
                        const data = await getUserInventory(user.uid);
                        if (data.length > 0) setInventory(data);
                    }
                } catch (e) {
                    console.error("Failed to load inventory for 3D view", e);
                }
            }
        };
        initData();
    }, [inventory.length, setInventory]);

    return (
        <div className="w-full h-full relative bg-gray-900">
            <Canvas gl={{ antialias: true, logarithmicDepthBuffer: true }}>
                <PerspectiveCamera
                    makeDefault
                    position={controlMode === 'walk' ? walkStartPosition : orbitPosition}
                    fov={controlMode === 'walk' ? 75 : 60}
                    near={0.01}
                    far={1000}
                />
                {controlMode !== 'walk' && (
                    <OrbitControls
                        makeDefault
                        maxPolarAngle={Math.PI / 2 - 0.05}
                        minPolarAngle={0.1}
                        enableDamping
                        dampingFactor={0.25}
                        rotateSpeed={1.5}
                        panSpeed={2.0}
                        zoomSpeed={1.5}
                        zoomToCursor={true}
                        minDistance={0.05}
                        maxDistance={200}
                        enablePan={true}
                        enableRotate={controlMode === 'orbit'}
                        screenSpacePanning={true}
                        keyPanSpeed={25}
                        mouseButtons={controlMode === 'pan'
                            ? { LEFT: 2, MIDDLE: 2, RIGHT: 2 }
                            : { LEFT: 0, MIDDLE: 1, RIGHT: 2 }
                        }
                    />
                )}
                <FirstPersonControls
                    enabled={controlMode === 'walk'}
                    onSelectBox={(box: BoxData | null) => {
                        // Select box to show info panel (not grab)
                        if (box) {
                            setSelectedProduct({
                                product: box.product,
                                quantity: box.quantity,
                                productId: box.productId,
                                boxData: box  // Pass full box data for grab button
                            });
                        } else {
                            setSelectedProduct(null);
                        }
                    }}
                />
                <Scene onProductClick={setSelectedProduct} />
                {controlMode === 'walk' && <CarriedBox box={heldBox} />}
            </Canvas>

            {/* Crosshair for Walk Mode */}
            {controlMode === 'walk' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-white/70 absolute"></div>
                        <div className="w-0.5 h-4 bg-white/70 absolute"></div>
                        <div className="w-1.5 h-1.5 border-2 border-white/70 rounded-full absolute"></div>
                    </div>
                </div>
            )}

            {/* Held Item Display */}
            {controlMode === 'walk' && heldBox && (
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-green-500/50">
                    <p className="text-xs text-green-400 font-medium mb-1">🖐️ Holding:</p>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: heldBox.labelColor }}
                        >
                            📦
                        </div>
                        <div>
                            <p className="text-white text-sm font-medium">{heldBox.product.name}</p>
                            <p className="text-gray-400 text-xs">${heldBox.product.pricePerItem.toFixed(2)}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Press E to drop</p>
                </div>
            )}

            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/70 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                <button
                    onClick={() => setControlMode('orbit')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${controlMode === 'orbit'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title="Rotate Mode"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span>Rotate</span>
                </button>
                <button
                    onClick={() => setControlMode('pan')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${controlMode === 'pan'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title="Pan Mode"
                >
                    <Hand className="w-4 h-4" />
                    <span>Pan</span>
                </button>
                <button
                    onClick={() => { setControlMode('walk'); setHeldBox(null); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${controlMode === 'walk'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                    title="Walk Mode (First Person)"
                >
                    <Move className="w-4 h-4" />
                    <span>Walk</span>
                </button>
                {(pickedUpCount > 0 || placedBoxes.length > 0) && (
                    <div className="w-px bg-white/20 mx-1"></div>
                )}
                {(pickedUpCount > 0 || placedBoxes.length > 0) && (
                    <button
                        onClick={() => {
                            resetPlacedBoxes();
                            setPickedUpCount(0);
                            setHeldBox(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all bg-orange-600 text-white hover:bg-orange-700"
                        title="Reset all moved boxes to original positions"
                    >
                        <Undo2 className="w-4 h-4" />
                        <span>Reset ({pickedUpCount})</span>
                    </button>
                )}
            </div>

            {/* Info Overlay */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg pointer-events-none border border-white/10">
                {controlMode === 'walk' ? (
                    <>
                        <p className="text-xs text-green-400 font-medium">🎮 Walk Mode</p>
                        <p className="text-xs text-gray-300 mt-1">WASD move | Shift sprint | Q/Z look up/down</p>
                        <p className="text-xs text-gray-400">Space/Ctrl fly up/down | Click box to select</p>
                        <p className="text-xs text-gray-500 mt-0.5">ESC to release mouse</p>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-gray-300">
                            {controlMode === 'pan' ? '🖱️ Drag to pan | Scroll: Zoom' : '🖱️ Drag to rotate | Right-click: Pan | Scroll: Zoom'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">⌨️ Arrow keys to pan</p>
                    </>
                )}
            </div>

            {/* Product Detail Panel - Editable */}
            {selectedProduct && (
                <ProductEditPanel
                    selectedProduct={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    isWalkMode={controlMode === 'walk'}
                    onGrabBox={() => {
                        // Enter grab mode with the selected box
                        if (selectedProduct.boxData) {
                            setHeldBox(selectedProduct.boxData);
                            setPickedUpCount(prev => prev + 1);
                        }
                    }}
                    onSave={async (updatedProduct) => {
                        try {
                            const { updateInventoryProduct } = await import('@/lib/db');

                            // Update inventory product (this now controls shelf display)
                            await updateInventoryProduct(updatedProduct.id, updatedProduct);

                            // Refresh inventory
                            const { getCurrentUser } = await import('@/lib/auth');
                            const { getUserInventory } = await import('@/lib/db');
                            const user = await getCurrentUser();
                            if (user) {
                                const data = await getUserInventory(user.uid);
                                setInventory(data);
                            }
                            setSelectedProduct(null);
                        } catch (e) {
                            console.error("Failed to save product", e);
                            alert("Failed to save changes");
                        }
                    }}
                />
            )}
        </div>
    );
}


