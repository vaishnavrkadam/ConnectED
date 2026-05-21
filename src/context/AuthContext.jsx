// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; // Use onSnapshot for real-time
import { auth, db } from "../firebase";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isLoggedIn: false,
  role: null,
  signOut: () => Promise.resolve(),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        
        // This "listens" to the user document. 
        // As soon as it's created, the loading stops.
        const docRef = doc(db, "users", authUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
          } else {
            setProfile(null);
          }
          setLoading(false); 
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const contextValue = {
    user,
    profile,
    loading,
    isLoggedIn: !!user,
    role: profile?.role || null,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};