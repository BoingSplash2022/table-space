"use client";

import { useAuthContext } from "@/context/AuthContext";

export default function ActiveProfileBadge() {
  const { user, activeProfile } = useAuthContext();

  // If not signed in, show nothing
  if (!user) return null;

  const handle = activeProfile?.handle || "@no-profile";
  const displayName =
    activeProfile?.displayName && activeProfile.displayName.trim().length > 0
      ? activeProfile.displayName
      : "No profile selected";

  const initial =
    handle.replace("@", "").trim().charAt(0).toUpperCase() || "D";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.3rem 0.7rem",
        borderRadius: 999,
        background: "rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.08)",
        fontSize: "0.75rem",
        lineHeight: 1.2,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "999px",
          border: "1px solid rgba(0,0,0,0.3)",
          background:
            activeProfile?.avatarUrl && activeProfile.avatarUrl.trim()
              ? "transparent"
              : "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {activeProfile?.avatarUrl && activeProfile.avatarUrl.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeProfile.avatarUrl}
            alt={displayName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            {initial}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.75rem",
          }}
        >
          {handle}
        </span>
        <span
          style={{
            opacity: 0.75,
            fontSize: "0.7rem",
          }}
        >
          {displayName} · {user.email}
        </span>
      </div>
    </div>
  );
}
