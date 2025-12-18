'use client';

import { useEffect, useRef, useState } from 'react';
import useStore from '@/stores/useStore';
import { CONFIG, DEFAULT_AISLE } from '@/lib/constants';
import { Aisle } from '@/types';

export default function Canvas2DEditor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        getCurrentStore,
        getCurrentAisles,
        getSelectedAisle,
        selectedAisleId,
        setSelectedAisle,
        addAisle,
        currentStoreId,
    } = useStore();

    const [isDragging, setIsDragging] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, z: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [currentDragRect, setCurrentDragRect] = useState<{
        x: number;
        z: number;
        width: number;
        length: number;
    } | null>(null);

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null);
    const [resizeAisleId, setResizeAisleId] = useState<string | null>(null);
    const [originalAisle, setOriginalAisle] = useState<Aisle | null>(null);
    const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

    // Camera/view state
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(true);
    const [panToolActive, setPanToolActive] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [scale, setScale] = useState(10); // pixels per meter

    // Calculate canvas size based on store dimensions and container
    useEffect(() => {
        const updateCanvasSize = () => {
            const currentStore = getCurrentStore();
            const container = containerRef.current;

            if (!currentStore || !container) return;

            const containerRect = container.getBoundingClientRect();
            const availableWidth = containerRect.width - 20; // minimal padding
            const availableHeight = containerRect.height - 20;

            if (availableWidth <= 0 || availableHeight <= 0) return;

            // Store dimensions with padding
            const padding = 10; // meters
            const totalWidth = currentStore.width + padding * 2;
            const totalDepth = currentStore.depth + padding * 2;

            // Calculate scale to fit store in viewport
            const scaleX = availableWidth / totalWidth;
            const scaleY = availableHeight / totalDepth;
            const newScale = Math.min(scaleX, scaleY, 20); // max 20 pixels per meter

            // Canvas fills available space
            setScale(newScale);
            setCanvasSize({ width: availableWidth, height: availableHeight });
        };

        updateCanvasSize();

        // Use ResizeObserver to detect container size changes (e.g., sidebar collapse)
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            // Small debounce to ensure layout has reflowed
            requestAnimationFrame(() => {
                updateCanvasSize();
            });
        });

        resizeObserver.observe(container);
        window.addEventListener('resize', updateCanvasSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateCanvasSize);
        };
    }, [getCurrentStore()]);

    useEffect(() => {
        renderCanvas();
    }, [getCurrentStore(), selectedAisleId, currentDragRect, zoom, panOffset, showGrid, canvasSize, scale, hoveredHandle]);

    // Add wheel event listener with passive: false to prevent page zoom
    // Use refs to access current values without dependency issues
    const zoomRef = useRef(zoom);
    const panOffsetRef = useRef(panOffset);

    useEffect(() => {
        zoomRef.current = zoom;
        panOffsetRef.current = panOffset;
    }, [zoom, panOffset]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelCapture = (e: WheelEvent) => {
            e.preventDefault();

            // Get mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

            // Calculate zoom factor
            const currentZoom = zoomRef.current;
            const currentPan = panOffsetRef.current;
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.1, Math.min(5, currentZoom * zoomFactor));

            // Calculate new pan offset to zoom toward cursor
            const newPanX = mouseX - (mouseX - currentPan.x) * (newZoom / currentZoom);
            const newPanY = mouseY - (mouseY - currentPan.y) * (newZoom / currentZoom);

            setZoom(newZoom);
            setPanOffset({ x: newPanX, y: newPanY });
        };

        canvas.addEventListener('wheel', handleWheelCapture, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheelCapture);
    }, []);

    const getMousePos = (evt: MouseEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY,
        };
    };

    const toWorld = (px: number, py: number) => {
        const padding = 10; // meters
        // Account for pan offset when converting to world coordinates
        const adjustedX = px - panOffset.x;
        const adjustedY = py - panOffset.y;
        return {
            x: (adjustedX / (scale * zoom)) - padding,
            z: (adjustedY / (scale * zoom)) - padding,
        };
    };

    const snap = (val: number) => Math.round(val);

    // Detect which resize handle the mouse is near
    const getResizeHandle = (worldPos: { x: number; z: number }, aisle: Aisle): { handle: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null; cursor: string } => {
        const handleSize = 0.8 / zoom; // Handle detection area in world units
        const left = aisle.x;
        const right = aisle.x + aisle.width;
        const top = aisle.z;
        const bottom = aisle.z + aisle.length;
        const midX = (left + right) / 2;
        const midZ = (top + bottom) / 2;

        // Check corners first (they take priority)
        if (Math.abs(worldPos.x - left) < handleSize && Math.abs(worldPos.z - top) < handleSize) {
            return { handle: 'nw', cursor: 'nwse-resize' };
        }
        if (Math.abs(worldPos.x - right) < handleSize && Math.abs(worldPos.z - top) < handleSize) {
            return { handle: 'ne', cursor: 'nesw-resize' };
        }
        if (Math.abs(worldPos.x - left) < handleSize && Math.abs(worldPos.z - bottom) < handleSize) {
            return { handle: 'sw', cursor: 'nesw-resize' };
        }
        if (Math.abs(worldPos.x - right) < handleSize && Math.abs(worldPos.z - bottom) < handleSize) {
            return { handle: 'se', cursor: 'nwse-resize' };
        }

        // Check edges
        if (Math.abs(worldPos.z - top) < handleSize && worldPos.x > left && worldPos.x < right) {
            return { handle: 'n', cursor: 'ns-resize' };
        }
        if (Math.abs(worldPos.z - bottom) < handleSize && worldPos.x > left && worldPos.x < right) {
            return { handle: 's', cursor: 'ns-resize' };
        }
        if (Math.abs(worldPos.x - left) < handleSize && worldPos.z > top && worldPos.z < bottom) {
            return { handle: 'w', cursor: 'ew-resize' };
        }
        if (Math.abs(worldPos.x - right) < handleSize && worldPos.z > top && worldPos.z < bottom) {
            return { handle: 'e', cursor: 'ew-resize' };
        }

        return { handle: null, cursor: 'default' };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Middle mouse, Shift+Click, or Pan Tool active
        if (e.button === 1 || (e.button === 0 && e.shiftKey) || panToolActive) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            return;
        }

        const pos = getMousePos(e.nativeEvent, canvas);
        const worldPos = toWorld(pos.x, pos.y);
        const currentStore = getCurrentStore();

        if (!currentStore) return;

        const currentAisles = getCurrentAisles();

        // Check if clicking on a resize handle of the selected aisle
        if (selectedAisleId) {
            const selectedAisle = currentAisles.find(a => a.id === selectedAisleId);
            if (selectedAisle) {
                const { handle } = getResizeHandle(worldPos, selectedAisle);
                if (handle) {
                    // Start resize mode
                    setIsResizing(true);
                    setResizeHandle(handle);
                    setResizeAisleId(selectedAisleId);
                    setOriginalAisle({ ...selectedAisle });
                    return;
                }
            }
        }

        // Check if clicked on an aisle
        let clickedAisleId: string | null = null;
        for (let i = currentAisles.length - 1; i >= 0; i--) {
            const a = currentAisles[i];
            if (
                worldPos.x >= a.x &&
                worldPos.x <= a.x + a.width &&
                worldPos.z >= a.z &&
                worldPos.z <= a.z + a.length
            ) {
                clickedAisleId = a.id;
                break;
            }
        }

        if (clickedAisleId) {
            setSelectedAisle(clickedAisleId);
            setIsDragging(false);
        } else {
            setSelectedAisle(null);
            setIsDragging(true);
            setDragStart({ x: snap(worldPos.x), z: snap(worldPos.z) });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
            return;
        }

        const pos = getMousePos(e.nativeEvent, canvas);
        const worldPos = toWorld(pos.x, pos.y);
        const currentStore = getCurrentStore();
        const currentAisles = getCurrentAisles();

        // Handle resize dragging
        if (isResizing && originalAisle && resizeHandle) {
            const currentX = snap(worldPos.x);
            const currentZ = snap(worldPos.z);

            let newX = originalAisle.x;
            let newZ = originalAisle.z;
            let newWidth = originalAisle.width;
            let newLength = originalAisle.length;

            // Calculate new dimensions based on which handle is being dragged
            if (resizeHandle.includes('n')) {
                const deltaZ = currentZ - originalAisle.z;
                newZ = Math.min(currentZ, originalAisle.z + originalAisle.length - 1);
                newLength = originalAisle.length - (newZ - originalAisle.z);
            }
            if (resizeHandle.includes('s')) {
                newLength = Math.max(1, currentZ - originalAisle.z);
            }
            if (resizeHandle.includes('w')) {
                const deltaX = currentX - originalAisle.x;
                newX = Math.min(currentX, originalAisle.x + originalAisle.width - 1);
                newWidth = originalAisle.width - (newX - originalAisle.x);
            }
            if (resizeHandle.includes('e')) {
                newWidth = Math.max(1, currentX - originalAisle.x);
            }

            // Update the drag rect to show preview
            setCurrentDragRect({
                x: newX,
                z: newZ,
                width: Math.max(1, newWidth),
                length: Math.max(1, newLength)
            });
            return;
        }

        // Update cursor based on hovered handle when not dragging
        if (selectedAisleId && !isDragging && !isResizing) {
            const selectedAisle = currentAisles.find(a => a.id === selectedAisleId);
            if (selectedAisle) {
                const { handle, cursor } = getResizeHandle(worldPos, selectedAisle);
                setHoveredHandle(handle);
                if (handle) {
                    canvas.style.cursor = cursor;
                    return;
                }
            }
        }

        // Reset cursor if not over a handle
        if (!isDragging && !isResizing && !panToolActive) {
            canvas.style.cursor = 'crosshair';
            setHoveredHandle(null);
        }

        if (!isDragging) return;

        const currentX = snap(worldPos.x);
        const currentZ = snap(worldPos.z);

        const x = Math.min(dragStart.x, currentX);
        const z = Math.min(dragStart.z, currentZ);
        const w = Math.abs(currentX - dragStart.x);
        const l = Math.abs(currentZ - dragStart.z);

        setCurrentDragRect({ x, z, width: w || 1, length: l || 1 });
    };

    const handleMouseUp = async () => {
        // Handle resize completion
        if (isResizing && currentDragRect && resizeAisleId && currentStoreId) {
            const currentStore = getCurrentStore();
            const currentAisles = getCurrentAisles();

            if (currentStore) {
                // Validate bounds
                const isValid =
                    currentDragRect.x >= 0 &&
                    currentDragRect.z >= 0 &&
                    currentDragRect.x + currentDragRect.width <= currentStore.width &&
                    currentDragRect.z + currentDragRect.length <= currentStore.depth &&
                    currentDragRect.width >= 1 &&
                    currentDragRect.length >= 1;

                // Check for overlap with other aisles (not the one being resized)
                const overlaps = currentAisles.some((aisle) => {
                    if (aisle.id === resizeAisleId) return false; // Skip self
                    return !(
                        currentDragRect.x + currentDragRect.width <= aisle.x ||
                        currentDragRect.x >= aisle.x + aisle.width ||
                        currentDragRect.z + currentDragRect.length <= aisle.z ||
                        currentDragRect.z >= aisle.z + aisle.length
                    );
                });

                if (isValid && !overlaps) {
                    // Save to Firestore
                    try {
                        const { updateAisle: updateAisleDb } = await import('@/lib/db');
                        await updateAisleDb(resizeAisleId, {
                            x: currentDragRect.x,
                            z: currentDragRect.z,
                            width: currentDragRect.width,
                            length: currentDragRect.length,
                        });

                        // Update local state via Zustand
                        const { updateAisle } = useStore.getState();
                        updateAisle(resizeAisleId, {
                            x: currentDragRect.x,
                            z: currentDragRect.z,
                            width: currentDragRect.width,
                            length: currentDragRect.length,
                        });
                    } catch (error) {
                        console.error('Failed to save resize:', error);
                    }
                }
            }

            // Reset resize state
            setIsResizing(false);
            setResizeHandle(null);
            setResizeAisleId(null);
            setOriginalAisle(null);
            setCurrentDragRect(null);
            return;
        }

        if (isDragging && currentDragRect && currentStoreId) {
            const currentStore = getCurrentStore();
            if (!currentStore) {
                setCurrentDragRect(null);
                setIsDragging(false);
                setIsPanning(false);
                return;
            }

            // Minimum size check - must drag at least 1m in both directions
            const MIN_SIZE = 1;
            if (currentDragRect.width < MIN_SIZE || currentDragRect.length < MIN_SIZE) {
                // Too small, cancel creation (this was just a click, not a drag)
                setCurrentDragRect(null);
                setIsDragging(false);
                setIsPanning(false);
                return;
            }

            // Check if aisle is within store bounds
            const aisleRight = currentDragRect.x + currentDragRect.width;
            const aisleBottom = currentDragRect.z + currentDragRect.length;

            if (
                currentDragRect.x < 0 ||
                currentDragRect.z < 0 ||
                aisleRight > currentStore.width ||
                aisleBottom > currentStore.depth
            ) {
                // Out of bounds, cancel
                setCurrentDragRect(null);
                setIsDragging(false);
                setIsPanning(false);
                return;
            }

            // Check for overlap with existing aisles
            const currentAisles = getCurrentAisles();
            const overlaps = currentAisles.some((aisle) => {
                const newLeft = currentDragRect.x;
                const newRight = currentDragRect.x + currentDragRect.width;
                const newTop = currentDragRect.z;
                const newBottom = currentDragRect.z + currentDragRect.length;

                const existingLeft = aisle.x;
                const existingRight = aisle.x + aisle.width;
                const existingTop = aisle.z;
                const existingBottom = aisle.z + aisle.length;

                // Check if rectangles overlap
                return !(
                    newRight <= existingLeft ||
                    newLeft >= existingRight ||
                    newBottom <= existingTop ||
                    newTop >= existingBottom
                );
            });

            if (overlaps) {
                // Overlapping, cancel creation
                setCurrentDragRect(null);
                setIsDragging(false);
                setIsPanning(false);
                return;
            }

            const newAisleName = `Aisle ${currentAisles.length + 1}`;

            const newAisle = {
                name: newAisleName,
                storeId: currentStoreId,
                ...currentDragRect,
                ...DEFAULT_AISLE,
                products: [],
            };

            // Save to Firestore
            try {
                const { createAisle } = await import('@/lib/db');
                const aisleId = await createAisle(currentStoreId, {
                    name: newAisleName,
                    ...currentDragRect,
                    ...DEFAULT_AISLE,
                    products: [],
                });

                // Update Zustand store with the new aisle (including its ID)
                addAisle({ ...newAisle, id: aisleId });
            } catch (error) {
                console.error('Failed to create aisle:', error);
            }

            setCurrentDragRect(null);
        }
        setIsDragging(false);
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(5, prev * 1.2));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(0.1, prev / 1.2));
    };

    const handleFitToScreen = () => {
        const currentStore = getCurrentStore();
        if (!currentStore) {
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
            return;
        }

        // Use store dimensions for fitting
        const width = currentStore.width;
        const height = currentStore.depth;
        const padding = 5; // Extra padding in meters

        const zoomX = (CONFIG.canvasWidth * 0.9) / ((width + padding) * CONFIG.scale);
        const zoomY = (CONFIG.canvasHeight * 0.9) / ((height + padding) * CONFIG.scale);
        const newZoom = Math.min(zoomX, zoomY, 2);

        setZoom(newZoom);
        setPanOffset({ x: 0, y: 0 });
    };

    const handleReset = () => {
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
    };

    const renderCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentStore = getCurrentStore();
        if (!currentStore) return;

        const padding = 10; // meters
        const paddingPx = padding * scale * zoom;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply pan offset using transform
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);

        // Draw grid
        if (showGrid) {
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            const gridSizePx = scale * zoom; // 1 meter grid

            for (let x = paddingPx; x < canvas.width; x += gridSizePx) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = paddingPx; y < canvas.height; y += gridSizePx) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }

        // Store boundaries (starts at padding offset)
        const storeScreenWidth = currentStore.width * scale * zoom;
        const storeScreenDepth = currentStore.depth * scale * zoom;
        const storeBoundX = paddingPx;
        const storeBoundY = paddingPx;

        // Store background
        ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.fillRect(storeBoundX, storeBoundY, storeScreenWidth, storeScreenDepth);

        // Store outline
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(storeBoundX, storeBoundY, storeScreenWidth, storeScreenDepth);
        ctx.setLineDash([]);

        // Store dimensions label
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(
            `Store: ${currentStore.width}m × ${currentStore.depth}m`,
            storeBoundX + 10,
            storeBoundY - 10
        );

        // Draw aisles
        const drawAisle = (a: Aisle, isSelected: boolean, isGhost: boolean) => {
            const screenX = paddingPx + a.x * scale * zoom;
            const screenY = paddingPx + a.z * scale * zoom;
            const screenW = a.width * scale * zoom;
            const screenL = a.length * scale * zoom;

            ctx.fillStyle = isGhost
                ? 'rgba(0, 123, 255, 0.3)'
                : isSelected
                    ? '#007bff'
                    : '#34495e';
            ctx.fillRect(screenX, screenY, screenW, screenL);

            if (isSelected) {
                ctx.strokeStyle = '#0056b3';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, screenY, screenW, screenL);

                // Draw resize handles for selected aisle
                const handleSize = 8;
                const handles = [
                    { x: screenX, y: screenY, type: 'nw' },
                    { x: screenX + screenW / 2, y: screenY, type: 'n' },
                    { x: screenX + screenW, y: screenY, type: 'ne' },
                    { x: screenX + screenW, y: screenY + screenL / 2, type: 'e' },
                    { x: screenX + screenW, y: screenY + screenL, type: 'se' },
                    { x: screenX + screenW / 2, y: screenY + screenL, type: 's' },
                    { x: screenX, y: screenY + screenL, type: 'sw' },
                    { x: screenX, y: screenY + screenL / 2, type: 'w' },
                ];

                handles.forEach(h => {
                    ctx.fillStyle = hoveredHandle === h.type ? '#ffd700' : '#ffffff';
                    ctx.strokeStyle = '#0056b3';
                    ctx.lineWidth = 2;
                    ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                });
            }

            if (!isGhost && zoom > 0.3) {
                ctx.fillStyle = 'white';
                const fontSize = Math.max(12, 16 * zoom);
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillText(a.name, screenX + 5, screenY + fontSize + 4);
                if (zoom > 0.5) {
                    ctx.font = `${fontSize * 0.75}px Arial`;
                    ctx.fillText(`${a.width}m x ${a.length}m`, screenX + 5, screenY + fontSize * 2 + 6);
                }
            }
        };

        const aisles = getCurrentAisles();
        aisles.forEach((a) => {
            drawAisle(a, a.id === selectedAisleId, false);
        });

        if (currentDragRect) {
            // Check if placement is valid
            const isOutOfBounds =
                currentDragRect.x < 0 ||
                currentDragRect.z < 0 ||
                currentDragRect.x + currentDragRect.width > currentStore.width ||
                currentDragRect.z + currentDragRect.length > currentStore.depth;

            const overlapsExisting = aisles.some((aisle) => {
                // Skip the aisle being resized - it shouldn't count as overlap with itself
                if (isResizing && aisle.id === resizeAisleId) return false;

                const newRight = currentDragRect.x + currentDragRect.width;
                const newBottom = currentDragRect.z + currentDragRect.length;
                const existingRight = aisle.x + aisle.width;
                const existingBottom = aisle.z + aisle.length;

                return !(
                    newRight <= aisle.x ||
                    currentDragRect.x >= existingRight ||
                    newBottom <= aisle.z ||
                    currentDragRect.z >= existingBottom
                );
            });

            const isTooSmall = currentDragRect.width < 1 || currentDragRect.length < 1;
            const isInvalid = isOutOfBounds || overlapsExisting || isTooSmall;

            // Draw preview with color based on validity
            const screenX = paddingPx + currentDragRect.x * scale * zoom;
            const screenY = paddingPx + currentDragRect.z * scale * zoom;
            const screenW = currentDragRect.width * scale * zoom;
            const screenL = currentDragRect.length * scale * zoom;

            ctx.fillStyle = isInvalid
                ? 'rgba(239, 68, 68, 0.4)' // red for invalid
                : 'rgba(34, 197, 94, 0.4)'; // green for valid
            ctx.fillRect(screenX, screenY, screenW, screenL);

            ctx.strokeStyle = isInvalid ? '#dc2626' : '#16a34a';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(screenX, screenY, screenW, screenL);
            ctx.setLineDash([]);

            // Show dimensions
            if (!isTooSmall) {
                ctx.fillStyle = isInvalid ? '#dc2626' : '#16a34a';
                ctx.font = 'bold 12px Arial';
                ctx.fillText(
                    `${currentDragRect.width}m × ${currentDragRect.length}m`,
                    screenX + 5,
                    screenY + 16
                );
            }
        }

        // Restore transform state
        ctx.restore();
    };

    return (
        <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={`bg-white shadow-2xl max-w-full max-h-full ${isPanning ? 'cursor-grabbing' : panToolActive ? 'cursor-grab' : 'cursor-crosshair'
                    }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

            {/* Control Panel */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl p-3 space-y-2">
                {/* Pan Tool Toggle */}
                <button
                    onClick={() => setPanToolActive(!panToolActive)}
                    className={`w-full p-2 rounded-lg transition-all flex items-center justify-center gap-2 ${panToolActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    title={panToolActive ? 'Switch to Draw Mode' : 'Switch to Pan Mode'}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                    <span className="text-xs font-semibold">{panToolActive ? 'Pan' : 'Draw'}</span>
                </button>

                <div className="border-t border-gray-200 my-2"></div>

                {/* Zoom Controls */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Zoom In (Scroll Up)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>

                    <div className="text-center text-xs font-semibold text-gray-600">
                        {Math.round(zoom * 100)}%
                    </div>

                    <button
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Zoom Out (Scroll Down)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                </div>

                <div className="border-t border-gray-200 my-2"></div>

                {/* View Controls */}
                <button
                    onClick={handleFitToScreen}
                    className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Fit to Screen"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>

                <button
                    onClick={handleReset}
                    className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Reset View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                    title="Toggle Grid"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                </button>

                {/* Help Toggle */}
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className={`w-full p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${showHelp ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                        }`}
                    title="Toggle Help"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            {/* Help Text - Toggleable */}
            {showHelp && (
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg text-sm space-y-1 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Keyboard Shortcuts</span>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="text-white/60 hover:text-white"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div>🖱️ <strong>Drag</strong> to create aisles</div>
                    <div>🖱️ <strong>Shift + Drag</strong> to pan</div>
                    <div>🖱️ <strong>Scroll</strong> to zoom</div>
                    <div>🖱️ <strong>Click</strong> aisle to select</div>
                    <div>🔲 <strong>Drag handles</strong> to resize</div>
                </div>
            )}
        </div>
    );
}
