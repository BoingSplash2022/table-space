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
  getDocs,
  limit,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

import WatchTogether from "./WatchTogether";
import VoiceChat from "./VoiceChat";

/* -----------------------------------------------------------
   TYPES
------------------------------------------------------------ */

type Thread = {
  id: string;
  participants: string[];
  otherHandle: string | null;
  name?: string;
  isGroup?: boolean;
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

type Profile = {
  id: string;
  handle: string;
};

/* -----------------------------------------------------------
   COMPONENT
------------------------------------------------------------ */

export default function MessagesClient() {
  const { user, activeProfile } = useAuthContext();
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  // Direct message
  const [showNewThread, setShowNewThread] = useState(false);
  const [newHandle, setNewHandle] = useState("");

  // Group chat
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupResults, setGroupResults] = useState<Profile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);

  // Media features
  const [showWatch, setShowWatch] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  const canUseChat = Boolean(user && activeProfile);

  /* -----------------------------------------------------------
     LOAD THREADS
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!user || !activeProfile) {
      setThreads([]);
      return;
    }

    const qThreads = query(
      collection(db, "threads"),
      where("participants", "array-contains", activeProfile.handle)
    );

    const unsub = onSnapshot(qThreads, (snap) => {
      const list: Thread[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          const isGroup = data.isGroup === true;

          const others = (data.participants || []).filter(
            (h: string) => h !== activeProfile.handle
          );

          const otherHandle = isGroup ? null : others[0] || "Unknown DJ";

          const lastAt =
            data.lastMessageAt instanceof Timestamp
              ? data.lastMessageAt.toDate()
              : data.lastMessageAt?.toDate?.() ?? null;

          const unread =
            data.lastMessageFrom &&
            data.lastMessageFrom !== activeProfile.handle &&
            !(data.lastMessageReadBy || []).includes(activeProfile.handle);

          return {
            id: d.id,
            participants: data.participants,
            name: data.name || null,
            otherHandle,
            isGroup,
            lastMessagePreview: data.lastMessagePreview ?? "",
            lastMessageAt: lastAt,
            unread,
          };
        })
        .sort(
          (a, b) =>
            (b.lastMessageAt?.getTime() ?? 0) -
            (a.lastMessageAt?.getTime() ?? 0)
        );

      setThreads(list);

      if (!activeThreadId && list.length > 0) {
        setActiveThreadId(list[0].id);
      }
    });

    return () => unsub();
  }, [user, activeProfile, activeThreadId]);

  /* -----------------------------------------------------------
     LOAD MESSAGES
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!activeThreadId || !activeProfile) return;

    const qMsgs = query(
      collection(db, "threads", activeThreadId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(qMsgs, (snap) => {
      const list: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const created =
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt?.toDate?.() ?? null;

        return {
          id: d.id,
          fromHandle: data.fromHandle,
          text: data.text,
          createdAt: created,
          mine: data.fromHandle === activeProfile.handle,
        };
      });

      setMessages(list);
    });

    return () => unsub();
  }, [activeThreadId, activeProfile]);

  /* -----------------------------------------------------------
     MARK THREAD AS READ
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!activeThreadId || !activeProfile) return;

    updateDoc(doc(db, "threads", activeThreadId), {
      lastMessageReadBy: arrayUnion(activeProfile.handle),
    }).catch(() => {});
  }, [activeThreadId, activeProfile]);

  /* -----------------------------------------------------------
     SEARCH PROFILES
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!groupSearch.trim()) {
      setGroupResults([]);
      return;
    }

    const fetch = async () => {
      const qProfiles = query(
        collection(db, "profiles"),
        orderBy("handle"),
        startAt(groupSearch),
        endAt(groupSearch + "~"),
        limit(10)
      );

      const snap = await getDocs(qProfiles);
      setGroupResults(
        snap.docs.map((d) => ({
          id: d.id,
          handle: d.data().handle,
        }))
      );
    };

    fetch();
  }, [groupSearch]);

  /* -----------------------------------------------------------
     CREATE GROUP CHAT
  ------------------------------------------------------------ */
  async function createGroupChat(e: FormEvent) {
    e.preventDefault();
    if (!activeProfile || selectedMembers.length === 0) return;

    const participants = [
      activeProfile.handle,
      ...selectedMembers.map((m) => m.handle),
    ];

    const docRef = await addDoc(collection(db, "threads"), {
      participants,
      isGroup: true,
      name: groupName || null,
      createdBy: activeProfile.handle,
      lastMessagePreview: "",
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: activeProfile.handle,
      lastMessageReadBy: [activeProfile.handle],
    });

    setActiveThreadId(docRef.id);
    setShowGroupForm(false);
    setGroupName("");
    setSelectedMembers([]);
  }

  /* -----------------------------------------------------------
     CREATE DIRECT MESSAGE
  ------------------------------------------------------------ */
  async function createDirectHandle() {
    if (!activeProfile || !newHandle.trim()) return;

    const handle =
      newHandle.startsWith("@") ? newHandle.trim() : `@${newHandle.trim()}`;

    const docRef = await addDoc(collection(db, "threads"), {
      participants: [activeProfile.handle, handle],
      isGroup: false,
      lastMessagePreview: "",
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: activeProfile.handle,
      lastMessageReadBy: [activeProfile.handle],
    });

    setActiveThreadId(docRef.id);
    setShowNewThread(false);
    setNewHandle("");
  }

  /* -----------------------------------------------------------
     SEND MESSAGE
  ------------------------------------------------------------ */
  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeThreadId || !activeProfile) return;

    const msg = text.trim();

    await addDoc(collection(db, "threads", activeThreadId, "messages"), {
      fromHandle: activeProfile.handle,
      text: msg,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "threads", activeThreadId), {
      lastMessagePreview: msg,
      lastMessageAt: serverTimestamp(),
      lastMessageFrom: activeProfile.handle,
      lastMessageReadBy: [activeProfile.handle],
    });

    setText("");
  }

  /* -----------------------------------------------------------
     UI
  ------------------------------------------------------------ */

  if (!canUseChat) {
    return (
      <div className="feed">
        <div className="feed-header">
          <h1>Messages</h1>
          <p>Please pick or create a profile first.</p>
        </div>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Messages</h1>
        <p>Chat, groups & watch together.</p>
      </div>

      <div className="messages-layout">
        {/* SIDEBAR */}
        <aside className="messages-sidebar">
          <div className="messages-sidebar-header">Conversations</div>

          {/* DIRECT MESSAGE */}
          <button
            className="messages-compose-send"
            onClick={() => {
              setShowGroupForm(false);
              setShowNewThread((p) => !p);
            }}
          >
            {showNewThread ? "Cancel" : "Start direct message"}
          </button>

          {showNewThread && (
            <div className="p-3">
              <input
                className="feed-input"
                placeholder="@handle"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
              <button
                className="messages-compose-send w-full mt-2"
                disabled={!newHandle.trim()}
                onClick={createDirectHandle}
              >
                Create DM
              </button>
            </div>
          )}

          {/* GROUP CHAT */}
          <button
            className="messages-compose-send"
            onClick={() => {
              setShowNewThread(false);
              setShowGroupForm((p) => !p);
            }}
          >
            {showGroupForm ? "Cancel" : "New group chat"}
          </button>

          {showGroupForm && (
            <form className="p-3 space-y-2" onSubmit={createGroupChat}>
              <label className="feed-label">Group name</label>
              <input
                className="feed-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Optional"
              />

              <label className="feed-label">Add DJs</label>
              <input
                className="feed-input"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search @handles"
              />

              {groupResults.length > 0 && (
                <div className="border rounded p-2 bg-white">
                  {groupResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="block w-full text-left p-1 hover:bg-gray-100"
                      onClick={() => {
                        if (selectedMembers.length >= 5) return;
                        if (
                          !selectedMembers.find((m) => m.handle === p.handle)
                        ) {
                          setSelectedMembers((prev) => [...prev, p]);
                        }
                      }}
                    >
                      {p.handle}
                    </button>
                  ))}
                </div>
              )}

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.handle}
                      className="px-2 py-1 bg-blue-200 rounded-full text-sm"
                    >
                      {m.handle}
                    </span>
                  ))}
                </div>
              )}

              <button
                className="messages-compose-send w-full"
                disabled={selectedMembers.length === 0}
              >
                Create group chat
              </button>
            </form>
          )}

          {/* THREAD LIST */}
          <div className="messages-thread-list">
            {threads.map((thread) => {
              const isActive = thread.id === activeThreadId;

              return (
                <button
                  key={thread.id}
                  className={
                    "messages-thread-item" +
                    (isActive ? " messages-thread-item-active" : "")
                  }
                  onClick={() => setActiveThreadId(thread.id)}
                >
                  <div className="messages-thread-avatar">
                    {thread.isGroup
                      ? thread.name?.charAt(0).toUpperCase() || "G"
                      : thread.otherHandle?.replace("@", "").charAt(0).toUpperCase()}
                  </div>

                  <div className="messages-thread-main">
                    <div className="messages-thread-row">
                      <span className="messages-thread-handle">
                        {thread.isGroup
                          ? thread.name ||
                            thread.participants.join(", ")
                          : thread.otherHandle}
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

        {/* THREAD VIEW */}
        <section className="messages-thread">
          <div className="messages-thread-header">
            {activeThread ? (
              <>
                <div className="messages-thread-avatar">
                  {activeThread.isGroup
                    ? activeThread.name?.charAt(0).toUpperCase() ?? "G"
                    : activeThread.otherHandle
                        ?.replace("@", "")
                        .charAt(0)
                        .toUpperCase()}
                </div>

                <div>
                  <div className="messages-thread-handle">
                    {activeThread.isGroup
                      ? activeThread.name ??
                        activeThread.participants.join(", ")
                      : activeThread.otherHandle}
                  </div>

                  {activeThread.isGroup && (
                    <div className="text-xs text-gray-500">
                      Members: {activeThread.participants.join(", ")}
                    </div>
                  )}

                  {/* FEATURE BUTTONS */}
                  <div className="flex gap-2 mt-2">
                    <button
                      className="messages-compose-send"
                      onClick={() => {
                        setShowWatch((p) => !p);
                        setShowVoice(false);
                      }}
                    >
                      {showWatch ? "Close watch" : "Watch together"}
                    </button>

                    <button
                      className="messages-compose-send"
                      onClick={() => {
                        setShowVoice((p) => !p);
                        setShowWatch(false);
                      }}
                    >
                      {showVoice ? "Close voice" : "Voice chat"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="messages-thread-sub">
                Select a conversation or start one.
              </div>
            )}
          </div>

          {/* WATCH TOGETHER */}
          {activeThreadId && showWatch && (
            <div className="p-3 border-b bg-gray-100">
              <WatchTogether threadId={activeThreadId} />
            </div>
          )}

          {/* VOICE CHAT */}
          {activeThreadId && showVoice && (
            <div className="p-3 border-b bg-gray-100">
              <VoiceChat threadId={activeThreadId} />
            </div>
          )}

          {/* MESSAGES */}
          <div className="messages-thread-body">
            {messages.map((m) => (
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
          </div>

          {/* COMPOSE MESSAGE */}
          <form className="messages-compose" onSubmit={handleSendMessage}>
            <textarea
              className="messages-compose-input"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
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
