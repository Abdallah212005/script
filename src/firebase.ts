import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Storage with safety check
let storageInstance: any = null;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app, firebaseConfig.storageBucket);
  } else {
    storageInstance = getStorage(app);
  }
} catch (error) {
  console.error("Firebase Storage initialization failed:", error);
}

export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();
