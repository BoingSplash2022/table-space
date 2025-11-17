"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export type Profile = {
  id: string;
  uid: string;          // owner uid
  handle: string;
  displayName: string;
};

type AuthContextType = {
  user: User | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profiles: [],
  activeProfile: null,
  setActiveProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Keep user in sync with Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  // Load profiles for the current user
  useEffect(() => {
    if (!user) {
      // logged out: clear everything
      setProfiles([]);
      setActiveProfile(null);
      return;
    }

    const q = query(
      collection(db, "profiles"),
      where("uid", "==", user.uid) // <— matches field we store & rules use
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows: Profile[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setProfiles(rows);
    });

    return () => unsub();
  }, [user]);

  // Whenever we have profiles but no activeProfile yet, auto-pick the first
  useEffect(() => {
    if (!activeProfile && profiles.length > 0) {
      setActiveProfile(profiles[0]);
    }
  }, [profiles, activeProfile]);

  const value: AuthContextType = {
    user,
    profiles,
    activeProfile,
    setActiveProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}



