import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  Timestamp,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a FirebaseProvider');
  return context;
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const isAdminEmail = user.email === "aamr222382@gmail.com";
        if (isAdminEmail) {
          setIsAdmin(true);
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
          } catch (e) {
            setIsAdmin(false);
          }
        }
        
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: isAdminEmail ? 'admin' : 'user',
            lastLogin: Timestamp.now(),
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Error saving user profile", e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized for login. Please add it to the Firebase Console authorized domains.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        setIsLoggingIn(false);
        return;
      }
      alert(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
