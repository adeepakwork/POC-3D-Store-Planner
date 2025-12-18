import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    createdAt: Date;
}

/**
 * Register a new user with email and password
 */
export async function registerUser(
    name: string,
    email: string,
    password: string
): Promise<User> {
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Update profile with display name
        await updateProfile(firebaseUser, { displayName: name });

        // Create user document in Firestore
        const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: name,
            createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);

        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: name,
            createdAt: new Date(),
        };
    } catch (error: any) {
        throw new Error(error.message || 'Failed to register user');
    }
}

/**
 * Sign in with email and password
 */
export async function loginUser(email: string, password: string): Promise<User> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: userData.displayName || firebaseUser.displayName || 'User',
                createdAt: userData.createdAt?.toDate() || new Date(),
            };
        }

        // Fallback if no Firestore document
        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            createdAt: new Date(),
        };
    } catch (error: any) {
        throw new Error(error.message || 'Failed to login');
    }
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle(): Promise<User> {
    try {
        const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();

        const userCredential = await signInWithPopup(auth, provider);
        const firebaseUser = userCredential.user;

        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        // Create user document if it doesn't exist (first-time Google login)
        if (!userDoc.exists()) {
            const userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email!,
                displayName: firebaseUser.displayName || 'User',
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        }

        return {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            createdAt: userDoc.exists() ? userDoc.data().createdAt?.toDate() : new Date(),
        };
    } catch (error: any) {
        throw new Error(error.message || 'Failed to sign in with Google');
    }
}

/**
 * Sign out the current user
 */
export async function logoutUser(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error: any) {
        throw new Error(error.message || 'Failed to logout');
    }
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            unsubscribe();

            if (firebaseUser) {
                // Try to get user data from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        resolve({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email!,
                            displayName: userData.displayName || firebaseUser.displayName || 'User',
                            createdAt: userData.createdAt?.toDate() || new Date(),
                        });
                    } else {
                        resolve({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email!,
                            displayName: firebaseUser.displayName || 'User',
                            createdAt: new Date(),
                        });
                    }
                } catch (error) {
                    resolve({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        displayName: firebaseUser.displayName || 'User',
                        createdAt: new Date(),
                    });
                }
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    callback({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        displayName: userData.displayName || firebaseUser.displayName || 'User',
                        createdAt: userData.createdAt?.toDate() || new Date(),
                    });
                } else {
                    callback({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        displayName: firebaseUser.displayName || 'User',
                        createdAt: new Date(),
                    });
                }
            } catch (error) {
                callback({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    displayName: firebaseUser.displayName || 'User',
                    createdAt: new Date(),
                });
            }
        } else {
            callback(null);
        }
    });
}
