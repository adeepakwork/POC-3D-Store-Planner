import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Store, Aisle, InventoryProduct } from '@/types';

/**
 * Create a new store in Firestore
 */
export async function createStore(
    userId: string,
    storeData: {
        name: string;
        description?: string;
        color: string;
        width: number;
        depth: number;
    }
): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'stores'), {
            ...storeData,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create store');
    }
}

/**
 * Get all stores for a user
 */
export async function getUserStores(userId: string): Promise<Store[]> {
    try {
        const q = query(collection(db, 'stores'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const stores: Store[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            stores.push({
                id: doc.id,
                name: data.name,
                description: data.description || '',
                width: data.width,
                depth: data.depth,
                color: data.color,
                userId: data.userId,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        return stores.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch stores');
    }
}

/**
 * Get a specific store by ID
 */
export async function getStore(storeId: string): Promise<Store | null> {
    try {
        const docRef = doc(db, 'stores', storeId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            description: data.description || '',
            width: data.width,
            depth: data.depth,
            color: data.color,
            userId: data.userId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch store');
    }
}

/**
 * Delete a store and all its aisles
 */
export async function deleteStore(storeId: string): Promise<void> {
    try {
        const batch = writeBatch(db);

        // Delete all aisles belonging to this store
        const aislesQuery = query(collection(db, 'aisles'), where('storeId', '==', storeId));
        const aislesSnapshot = await getDocs(aislesQuery);
        aislesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete the store
        batch.delete(doc(db, 'stores', storeId));

        await batch.commit();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete store');
    }
}

/**
 * Update store metadata
 */
export async function updateStore(
    storeId: string,
    updates: Partial<Store>
): Promise<void> {
    try {
        const docRef = doc(db, 'stores', storeId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update store');
    }
}

// ==================== AISLE OPERATIONS ====================

/**
 * Get all aisles for a specific store
 */
export async function getStoreAisles(storeId: string): Promise<Aisle[]> {
    try {
        const q = query(collection(db, 'aisles'), where('storeId', '==', storeId));
        const querySnapshot = await getDocs(q);

        const aisles: Aisle[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            aisles.push({
                id: doc.id,
                storeId: data.storeId,
                name: data.name,
                x: data.x,
                z: data.z,
                width: data.width,
                length: data.length,
                height: data.height,
                shelves: data.shelves,
                products: data.products || [],
            });
        });

        return aisles;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch aisles');
    }
}

/**
 * Create a new aisle
 */
export async function createAisle(
    storeId: string,
    aisleData: Omit<Aisle, 'id' | 'storeId'>
): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'aisles'), {
            ...aisleData,
            storeId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Update store's updatedAt timestamp
        await updateDoc(doc(db, 'stores', storeId), {
            updatedAt: serverTimestamp(),
        });

        return docRef.id;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create aisle');
    }
}

/**
 * Update an aisle
 */
export async function updateAisle(
    aisleId: string,
    updates: Partial<Aisle>
): Promise<void> {
    try {
        const docRef = doc(db, 'aisles', aisleId);
        const aisleDoc = await getDoc(docRef);

        if (!aisleDoc.exists()) {
            throw new Error('Aisle not found');
        }

        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });

        // Update parent store's updatedAt
        const storeId = aisleDoc.data().storeId;
        await updateDoc(doc(db, 'stores', storeId), {
            updatedAt: serverTimestamp(),
        });
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update aisle');
    }
}

/**
 * Delete an aisle
 */
export async function deleteAisle(aisleId: string): Promise<void> {
    try {
        const aisleDoc = await getDoc(doc(db, 'aisles', aisleId));

        if (!aisleDoc.exists()) {
            throw new Error('Aisle not found');
        }

        const storeId = aisleDoc.data().storeId;

        await deleteDoc(doc(db, 'aisles', aisleId));

        // Update parent store's updatedAt
        await updateDoc(doc(db, 'stores', storeId), {
            updatedAt: serverTimestamp(),
        });
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete aisle');
    }
}

// ==================== INVENTORY OPERATIONS ====================

/**
 * Get all inventory products for a user
 */
export async function getUserInventory(userId: string): Promise<InventoryProduct[]> {
    try {
        const q = query(collection(db, 'inventory'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const inventory: InventoryProduct[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            inventory.push({
                id: doc.id,
                userId: data.userId,
                name: data.name,
                sku: data.sku,
                category: data.category,
                boxDimensions: data.boxDimensions,
                itemsPerBox: data.itemsPerBox,
                labelColor: data.labelColor || data.boxColor || '#3B82F6', // Support both old and new field names
                pricePerItem: data.pricePerItem,
                totalBoxesStock: data.totalBoxesStock
            });
        });
        return inventory;
    } catch (error: any) {
        console.error("Error fetching inventory:", error);
        return [];
    }
}

/**
 * Create a new inventory product
 */
export async function createInventoryProduct(product: Omit<InventoryProduct, 'id'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'inventory'), {
            ...product,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to create product');
    }
}

/**
 * Update an inventory product
 */
export async function updateInventoryProduct(
    productId: string,
    updates: Partial<InventoryProduct>
): Promise<void> {
    try {
        const docRef = doc(db, 'inventory', productId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update product');
    }
}

/**
 * Delete an inventory product
 */
export async function deleteInventoryProduct(productId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'inventory', productId));
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete product');
    }
}

// ==================== PLACED BOXES OPERATIONS ====================

export interface PlacedBoxData {
    id?: string;
    boxId: string;
    productId: string;
    aisleId: string;
    userId: string;
    storeId: string;
    originalPosition: { x: number; y: number; z: number };
    newPosition: { x: number; y: number; z: number };
    movedAt?: Date;
}

/**
 * Save a placed box position
 */
export async function savePlacedBox(data: Omit<PlacedBoxData, 'id' | 'movedAt'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'placedBoxes'), {
            ...data,
            movedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to save placed box');
    }
}

/**
 * Get all placed boxes for a store
 */
export async function getStorePlacedBoxes(storeId: string): Promise<PlacedBoxData[]> {
    try {
        const q = query(collection(db, 'placedBoxes'), where('storeId', '==', storeId));
        const querySnapshot = await getDocs(q);

        const placedBoxes: PlacedBoxData[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            placedBoxes.push({
                id: doc.id,
                boxId: data.boxId,
                productId: data.productId,
                aisleId: data.aisleId,
                userId: data.userId,
                storeId: data.storeId,
                originalPosition: data.originalPosition,
                newPosition: data.newPosition,
                movedAt: data.movedAt?.toDate() || new Date(),
            });
        });
        return placedBoxes;
    } catch (error: any) {
        console.error("Error fetching placed boxes:", error);
        return [];
    }
}

/**
 * Delete a placed box
 */
export async function deletePlacedBox(boxId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'placedBoxes', boxId));
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete placed box');
    }
}

/**
 * Delete all placed boxes for a store (reset)
 */
export async function resetStorePlacedBoxes(storeId: string): Promise<void> {
    try {
        const q = query(collection(db, 'placedBoxes'), where('storeId', '==', storeId));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to reset placed boxes');
    }
}
