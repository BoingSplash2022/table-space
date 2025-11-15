// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (public — safe to keep on frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAv7hVHMkyjXEqSsyZIO5GAko_XOBj17PQ",
  authDomain: "table-space-fc222.firebaseapp.com",
  projectId: "table-space-fc222",
  storageBucket: "table-space-fc222.firebasestorage.app",
  messagingSenderId: "1041458906258",
  appId: "1:1041458906258:web:78fa0dda81e59ad01e524b",
  measurementId: "G-EECRTC75XV",
};

// Ensure Firebase is initialized once (Next.js renders multiple times)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
