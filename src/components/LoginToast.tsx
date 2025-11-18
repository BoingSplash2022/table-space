"use client";

import { useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";

export default function LoginToast() {
  const { justLoggedIn, setJustLoggedIn } = useAuthContext();

  useEffect(() => {
    if (justLoggedIn) {
      const timer = setTimeout(() => setJustLoggedIn(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, setJustLoggedIn]);

  if (!justLoggedIn) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1fa73e",
        color: "#fff",
        padding: "0.8rem 1.4rem",
        borderRadius: 8,
        fontWeight: 600,
        boxShadow:
          "0 3px 12px rgba(0,0,0,0.25)",
        zIndex: 9999,
        animation: "fadeUp 0.4s ease-out",
      }}
    >
      Success — you're in!
    </div>
  );
}
