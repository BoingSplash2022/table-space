// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- Your Firebase web config ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAv7hVHMkyjXEqSsyZIO5GAko_XOBj17PQ",
  authDomain: "table-space-fc222.firebaseapp.com",
  projectId: "table-space-fc222",
  storageBucket: "table-space-fc222.firebasestorage.app",
  messagingSenderId: "1041458906258",
  appId: "1:1041458906258:web:78fa0dda81e59ad01e524b",
  measurementId: "G-EECRTC75XV"
};

// Avoid re-initialising in dev / hot reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// 🔥 Storage – used for avatar uploads
export const storage = getStorage(app);



