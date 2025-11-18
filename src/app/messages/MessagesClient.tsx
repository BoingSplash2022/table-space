"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Thread = {
  id: string;
  otherHandle: string;
  lastMessagePreview: string;
  lastMessageAt: Date | null;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  fromHandle: string;
  text: string;
  createdAt: Date | null;
  mine: boolean;
};

export default function MessagesClient() {
  const { user, activeProfile } = useAuthContext();
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New-thread UI state
  const [showNewThread, setShowNewThread] = useState(false);
  const [newHandle, setNewHandle] = useState("");

  // From Buy/Sell "Message seller"
  const sellerFromQuery = searchParams.get("seller");
  const listingTitleFromQuery = searchParams.get("listingTitle");

  const canUseChat = Boolean(user && activeProfile);

  // -------------------- Load threads for this profile --------------------
  useEffect(() => {
    if (!user || !activeProfile) {
      setThreads([]);
      setActiveThreadId(null);
      return;
    }

    setLoadingThreads(true);

    try {
      const threadsRef = collection(db, "threads");
      // No orderBy here to avoid composite index requirement in rules
      const q = query(
        threadsRef,
        where("participants", "array-contains", activeProfile.handle)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: Thread[] = snap.docs
            .map((d) => {
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
            })
            // sort newest first on the client
            .sort((a, b) => {
              const aTime = a.lastMessageAt?.getTime() ?? 0;
              const bTime = b.lastMessageAt?.getTime() ?? 0;
              return bTime - aTime;
            });

          setThreads(list);
          setLoadingThreads(false);

          if (!activeThreadId && list.length > 0) {
            setActiveThreadId(list[0].id);
          }
        },
        (err) => {
          console.error("Error loading threads", err);
          setLoadingThreads(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("Error setting up threads listener", err);
      setLoadingThreads(false);
    }
  }, [user, activeProfile, activeThreadId]);

  // -------------------- Load messages for active thread --------------------
  useEffect(() => {
    if (!user || !activeProfile || !activeThreadId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    try {
      const msgsRef = collection(db, "threads", activeThreadId, "messages");
      const q = query(msgsRef, orderBy("createdAt", "asc"));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: ChatMessage[] = snap.docs.map((d) => {
            const data = d.data() as any;
            const created: Date | null =
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : data.createdAt?.toDate
                ? data.createdAt.toDate()
                : null;

            return {
              id: d.id,
              fromHandle: data.fromHandle,
              text: data.text,
              createdAt: created,
              mine: data.fromHandle === activeProfile.handle,
            };
          });

          setMessages(list);
          setLoadingMessages(false);
        },
        (err) => {
          console.error("Error loading messages", err);
          setLoadingMessages(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("Error setting up messages listener", err);
      setLoadingMessages(false);
    }
  }, [user, activeProfile, activeThreadId]);

  // -------------------- Mark active thread as read --------------------
  useEffect(() => {
    if (!user || !activeProfile || !activeThreadId) return;

    const threadRef = doc(db, "threads", activeThreadId);
    updateDoc(threadRef, {
      lastMessageReadBy: arrayUnion(activeProfile.handle),
    }).catch((err) => {
      console.error("Error marking thread as read", err);
    });
  }, [user, activeProfile, activeThreadId]);

  // -------------------- Prefill text from Buy/Sell link --------------------
  useEffect(() => {
    if (!sellerFromQuery) return;

    setText(
      `Hey ${sellerFromQuery}, I saw your listing on Buy/Sell: ${
        listingTitleFromQuery ?? ""
      }`
    );
  }, [sellerFromQuery, listingTitleFromQuery]);

  // -------------------- Helpers --------------------
  async function createThreadWithHandle(handle: string): Promise<string | null> {
    if (!activeProfile) return null;

    const clean = handle.trim();
    if (!clean) return null;

    const normalized =
      clean.startsWith("@") || clean.startsWith("#") ? clean : `@${clean}`;

    const threadRef = await addDoc(collection(db, "threads"), {
      participants: [activeProfile.handle, normalized],
      lastMessagePreview: "",
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: activeProfile.handle,
      lastMessageReadBy: [activeProfile.handle],
    });

    return threadRef.id;
  }

  // New-thread form in the sidebar
  async function handleCreateThread(e: FormEvent) {
    e.preventDefault();
    if (!activeProfile || !newHandle.trim()) return;

    const threadId = await createThreadWithHandle(newHandle);
    if (!threadId) return;

    setActiveThreadId(threadId);
    setShowNewThread(false);
    setNewHandle("");
  }

  // Main "Send" button in the chat composer
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!user || !activeProfile || !text.trim()) return;

    let threadId = activeThreadId;

    // If no thread selected but we have a seller from query, start that thread
    if (!threadId && sellerFromQuery) {
      threadId = await createThreadWithHandle(sellerFromQuery);
      if (!threadId) return;
      setActiveThreadId(threadId);
    }

    if (!threadId) {
      return;
    }

    const trimmed = text.trim();

    const msgsRef = collection(db, "threads", threadId, "messages");
    await addDoc(msgsRef, {
      fromHandle: activeProfile.handle,
      text: trimmed,
      createdAt: serverTimestamp(),
    });

    const threadRef = doc(db, "threads", threadId);
    await updateDoc(threadRef, {
      lastMessagePreview: trimmed,
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: activeProfile.handle,
      lastMessageReadBy: [activeProfile.handle],
    });

    setText("");
  }

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // -------------------- RENDER --------------------

  if (!canUseChat) {
    return (
      <div className="feed">
        <div className="feed-header">
          <h1>Messages</h1>
          <p>Please pick or create a profile first on the Profile page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Messages</h1>
        <p>Chat one-to-one with other DJs on TableSpace.</p>
      </div>

      <div className="messages-layout">
        {/* LEFT: conversations + Start conversation */}
        <aside className="messages-sidebar">
          <div className="messages-sidebar-header">
            <span>Conversations</span>
          </div>

          <button
            type="button"
            className="messages-compose-send"
            style={{ margin: "0 0.5rem 0.5rem" }}
            onClick={() => setShowNewThread((prev) => !prev)}
          >
            {showNewThread ? "Cancel" : "Start conversation"}
          </button>

          {showNewThread && (
            <form
              onSubmit={handleCreateThread}
              style={{ padding: "0 0.5rem 0.75rem" }}
            >
              <label className="feed-label" htmlFor="newHandle">
                DJ handle
              </label>
              <input
                id="newHandle"
                className="feed-input"
                placeholder="@yourdjfriend"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
              <button
                type="submit"
                className="messages-compose-send"
                style={{ marginTop: "0.5rem", width: "100%" }}
                disabled={!newHandle.trim()}
              >
                Create thread
              </button>
            </form>
          )}

          <div className="messages-thread-list">
            {loadingThreads && (
              <div className="messages-empty">Loading conversations…</div>
            )}

            {!loadingThreads && threads.length === 0 && (
              <div className="messages-empty">
                No conversations yet. Start one with the button above or from a
                Buy/Sell listing.
              </div>
            )}

            {threads.map((thread) => {
              const initial = thread.otherHandle
                .replace("@", "")
                .charAt(0)
                .toUpperCase();

              const isActive = thread.id === activeThreadId;
              const itemClass =
                "messages-thread-item" +
                (isActive ? " messages-thread-item-active" : "");

              return (
                <button
                  key={thread.id}
                  className={itemClass}
                  onClick={() => setActiveThreadId(thread.id)}
                  type="button"
                >
                  <div className="messages-thread-avatar">{initial}</div>
                  <div className="messages-thread-main">
                    <div className="messages-thread-row">
                      <span className="messages-thread-handle">
                        {thread.otherHandle}
                      </span>
                      {thread.unread && (
                        <span className="messages-thread-unread">NEW</span>
                      )}
                    </div>
                    <div className="messages-thread-preview">
                      {thread.lastMessagePreview || "No messages yet"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: active conversation */}
        <section className="messages-thread">
          <div className="messages-thread-header">
            {activeThread ? (
              <>
                <div className="messages-thread-avatar">
                  {activeThread.otherHandle
                    .replace("@", "")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="messages-thread-handle">
                    {activeThread.otherHandle}
                  </div>
                  <div className="messages-thread-sub">
                    Chatting as {activeProfile?.handle}
                  </div>
                </div>
              </>
            ) : (
              <div className="messages-thread-sub">
                Pick a conversation on the left, click “Start conversation”, or
                start one from a Buy/Sell listing using “Message seller”.
              </div>
            )}
          </div>

          <div className="messages-thread-body">
            {loadingMessages && (
              <div className="messages-empty">Loading messages…</div>
            )}

            {!loadingMessages &&
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "messages-bubble-row " +
                    (m.mine
                      ? "messages-bubble-row-me"
                      : "messages-bubble-row-them")
                  }
                >
                  <div
                    className={
                      "messages-bubble " +
                      (m.mine
                        ? "messages-bubble-me"
                        : "messages-bubble-them")
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}

            {!loadingMessages && messages.length === 0 && activeThread && (
              <div className="messages-empty">
                No messages yet. Say hi to start the conversation.
              </div>
            )}
          </div>

          {/* Composer */}
          <form className="messages-compose" onSubmit={handleSendMessage}>
            <textarea
              className="messages-compose-input"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
            />
            <button
              type="submit"
              className="messages-compose-send"
              disabled={!text.trim()}
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
