// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext({
  user: null,
  profile: null,       // Combines root /users metadata
  extendedProfile: null, // Holds the live /students or /faculty dataset
  loading: true,
  isLoggedIn: false,
  role: null,
  signOut: () => Promise.resolve(),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [extendedProfile, setExtendedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;
    let unsubscribeExtended = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        
        // 1. Listen to the base authentication/role document
        const userDocRef = doc(db, "users", authUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setProfile({ id: userSnap.id, ...userData });
            
            // Determine target collection based on corporate rules matrix
            const targetCollection = userData.role === "student" ? "students" : "faculty";
            const extendedDocRef = doc(db, targetCollection, userData.primaryId);
            
            // 2. Clear previous extended listener if role changes mid-session
            if (unsubscribeExtended) unsubscribeExtended();
            
            // 3. Listen to the natural key collection for live updates (e.g. Activity Points changes)
            unsubscribeExtended = onSnapshot(extendedDocRef, (extendedSnap) => {
              if (extendedSnap.exists()) {
                setExtendedProfile({ id: extendedSnap.id, ...extendedSnap.data() });
              } else {
                setExtendedProfile(null);
              }
              setLoading(false);
            });

          } else {
            setProfile(null);
            setExtendedProfile(null);
            setLoading(false);
          }
        });
      } else {
        setUser(null);
        setProfile(null);
        setExtendedProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeExtended) unsubscribeExtended();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setExtendedProfile(null);
    setLoading(false);
  };

  const contextValue = {
    user,
    profile,
    extendedProfile,
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