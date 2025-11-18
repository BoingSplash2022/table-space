"use client";

import { useAuthContext } from "@/context/AuthContext";

export default function ProfileIndicator() {
  const { user, activeProfile } = useAuthContext();

  // Logged out → small subtle badge
  if (!user) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.25rem 0.6rem",
          borderRadius: 999,
          border: "1px solid #ccc",
          fontSize: "0.7rem",
          background: "rgba(255,255,255,0.8)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#aaa",
          }}
        />
        <span>Not signed in</span>
      </div>
    );
  }

  // Signed in but no profile yet
  if (user && !activeProfile) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.25rem 0.6rem",
          borderRadius: 999,
          border: "1px solid #f97316",
          fontSize: "0.7rem",
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#f97316",
          }}
        />
        <span>Signed in – no profile yet</span>
      </div>
    );
  }

  // Signed in + active profile → show avatar + handle
  const letter =
    activeProfile?.handle?.replace("@", "").trim().charAt(0).toUpperCase() ||
    "D";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0.7rem",
        borderRadius: 999,
        border: "1px solid #16a34a",
        fontSize: "0.75rem",
        background: "rgba(255,255,255,0.95)",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: "#16a34a",
        }}
      />

      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.8rem",
          fontWeight: 700,
        }}
      >
        {activeProfile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeProfile.avatarUrl}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          letter
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 600 }}>
          {activeProfile?.handle || "No handle"}
        </span>
        <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>
          Profile active
        </span>
      </div>
    </div>
  );
}
