export interface Dimensions {
  width: number;  // meters
  height: number; // meters
  depth: number;  // meters
}

export interface InventoryProduct {
  id: string;
  userId: string; // Added userId for DB ownership
  name: string;
  sku: string;
  category: string;

  // Box Specification
  boxDimensions: Dimensions;
  itemsPerBox: number;
  labelColor: string; // Color for the label stripe on box face

  // Pricing
  pricePerItem: number;

  // Stock
  totalBoxesStock: number;
}

// Individual box placement for box movement feature
export interface PlacedBox {
  id: string;
  productId: string;
  aisleId: string;
  shelfLevel: number;
  positionX: number;  // X position on shelf
  positionZ: number;  // Z position on shelf
  sourceAisleId: string;  // Original aisle (for undo)
  sourceShelfLevel: number;  // Original shelf (for undo)
}

export interface Aisle {
  id: string;
  storeId: string;
  name: string;
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  shelves: number;
  products: AisleProduct[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  unitPrice: string;
  color: string;
  imageUrl?: string;
  dimensions?: Dimensions;
}

export interface AisleProduct {
  id: string;
  productId: string;
  aisleId: string;
  quantityBoxes: number;
  shelfLevel: number;
  position: number;
}

export interface Store {
  id: string;
  name: string;
  description?: string;
  width: number;
  depth: number;
  color: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = '2d' | '3d';

export interface AppState {
  stores: Store[];
  currentStoreId: string | null;
  selectedAisleId: string | null;
  viewMode: ViewMode;
}
