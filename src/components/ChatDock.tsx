"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";

type MiniThread = {
  id: string;
  otherHandle: string;
  lastMessagePreview: string;
  lastMessageAt: Date | null;
  unread: boolean;
};

export default function ChatDock() {
  const { user, activeProfile } = useAuthContext();
  const [threads, setThreads] = useState<MiniThread[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !activeProfile) {
      setThreads([]);
      return;
    }

    const threadsRef = collection(db, "threads");
    const q = query(
      threadsRef,
      where("participants", "array-contains", activeProfile.handle)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MiniThread[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const others: string[] = (data.participants || []).filter(
            (h: string) => h !== activeProfile.handle
          );
          const otherHandle = others[0] || "Unknown DJ";

          const lastAt: Date | null =
            data.lastMessageAt instanceof Timestamp
              ? data.lastMessageAt.toDate()
              : data.lastMessageAt?.toDate
              ? data.lastMessageAt.toDate()
              : null;

          const unread =
            Boolean(data.lastMessageFrom) &&
            data.lastMessageFrom !== activeProfile.handle &&
            !(data.lastMessageReadBy || []).includes(activeProfile.handle);

          return {
            id: d.id,
            otherHandle,
            lastMessagePreview: data.lastMessagePreview ?? "",
            lastMessageAt: lastAt,
            unread,
          };
        });

        setThreads(list);
      },
      (err) => {
        console.error("Error in ChatDock threads listener", err);
      }
    );

    return () => unsub();
  }, [user, activeProfile]);

  if (!user || !activeProfile) return null;

  const unreadThreads = threads.filter((t) => t.unread);
  const unreadCount = unreadThreads.length;

  // If no unread, keep it subtle – you could also always show a bubble if you prefer
  if (unreadCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: "1rem",
        bottom: "1rem",
        zIndex: 50,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          borderRadius: 999,
          border: "none",
          padding: "0.5rem 0.9rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: "#111827",
          color: "#f9fafb",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
      >
        💬 {unreadCount} new message{unreadCount > 1 ? "s" : ""}
      </button>

      {open && (
        <div
          style={{
            marginTop: "0.5rem",
            width: 260,
            maxHeight: 260,
            background: "rgba(17,24,39,0.97)",
            color: "#f9fafb",
            borderRadius: 16,
            padding: "0.75rem",
            boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>New conversations</span>
            <Link
              href="/messages"
              style={{
                fontSize: "0.7rem",
                textDecoration: "underline",
                opacity: 0.85,
              }}
            >
              Open Messages
            </Link>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(249,250,251,0.1)",
              paddingTop: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              overflowY: "auto",
            }}
          >
            {unreadThreads.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  padding: "0.3rem 0.2rem",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#111827",
                    border: "1px solid #f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {t.otherHandle
                    .replace("@", "")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {t.otherHandle}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.8,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.lastMessagePreview || "New conversation"}
                  </div>
                </div>
              </div>
            ))}

            {unreadThreads.length === 0 && (
              <div
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.8,
                }}
              >
                No new messages.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
