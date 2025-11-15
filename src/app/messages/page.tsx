"use client";

import { FormEvent, useState } from "react";

type Message = {
  id: number;
  fromMe: boolean;
  text: string;
  createdAt: Date;
};

type Thread = {
  id: number;
  partnerHandle: string;
  lastPreview: string;
  unread: number;
};

const initialThreads: Thread[] = [
  {
    id: 1,
    partnerHandle: "@scratchmonk",
    lastPreview: "Yo, keen for that crab battle?",
    unread: 1,
  },
  {
    id: 2,
    partnerHandle: "@beatjugglekid",
    lastPreview: "Sending over my routine link 👀",
    unread: 0,
  },
];

const initialMessagesByThread: Record<number, Message[]> = {
  1: [
    {
      id: 1,
      fromMe: true,
      text: "Yo! Your slices in that last clip were nuts 🔥",
      createdAt: new Date(Date.now() - 1000 * 60 * 35),
    },
    {
      id: 2,
      fromMe: false,
      text: "Thanks! Keen for a little crab battle this weekend?",
      createdAt: new Date(Date.now() - 1000 * 60 * 28),
    },
  ],
  2: [
    {
      id: 3,
      fromMe: false,
      text: "Got a new beat juggle routine, sending the link soon.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
    },
  ],
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [messagesByThread, setMessagesByThread] = useState<
    Record<number, Message[]>
  >(initialMessagesByThread);
  const [activeThreadId, setActiveThreadId] = useState<number>(1);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const activeMessages = messagesByThread[activeThreadId] ?? [];

  function handleSelectThread(threadId: number) {
    setActiveThreadId(threadId);
    // mark as read in local state
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              unread: 0,
            }
          : t
      )
    );
  }

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (data.get("text") as string)?.trim();
    if (!text) return;

    const newMessage: Message = {
      id: Date.now(),
      fromMe: true,
      text,
      createdAt: new Date(),
    };

    setMessagesByThread((prev) => {
      const existing = prev[activeThreadId] ?? [];
      return {
        ...prev,
        [activeThreadId]: [...existing, newMessage],
      };
    });

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? { ...t, lastPreview: text }
          : t
      )
    );

    form.reset();
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Messages</h1>
        <p>
          Chat directly with other DJs. No comments, just DMs about scratches,
          routines, and battles.
        </p>
      </div>

      <div className="messages-layout">
        {/* LEFT: thread list */}
        <aside className="messages-sidebar">
          <div className="messages-sidebar-header">
            <span>Inbox</span>
          </div>
          <div className="messages-thread-list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={
                  "messages-thread-item" +
                  (thread.id === activeThreadId
                    ? " messages-thread-item-active"
                    : "")
                }
                onClick={() => handleSelectThread(thread.id)}
              >
                <div className="messages-thread-avatar">
                  {thread.partnerHandle
                    .replace("@", "")
                    .charAt(0)
                    .toUpperCase() || "D"}
                </div>
                <div className="messages-thread-main">
                  <div className="messages-thread-row">
                    <span className="messages-thread-handle">
                      {thread.partnerHandle}
                    </span>
                    {thread.unread > 0 && (
                      <span className="messages-thread-unread">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="messages-thread-preview">
                    {thread.lastPreview}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT: active conversation */}
        <section className="messages-thread">
          {activeThread ? (
            <>
              <header className="messages-thread-header">
                <div className="messages-thread-avatar">
                  {activeThread.partnerHandle
                    .replace("@", "")
                    .charAt(0)
                    .toUpperCase() || "D"}
                </div>
                <div>
                  <div className="messages-thread-handle">
                    {activeThread.partnerHandle}
                  </div>
                  <div className="messages-thread-sub">
                    Direct messages only – keep it friendly and about the
                    music.
                  </div>
                </div>
              </header>

              <div className="messages-thread-body">
                {activeMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      "messages-bubble-row" +
                      (msg.fromMe
                        ? " messages-bubble-row-me"
                        : " messages-bubble-row-them")
                    }
                  >
                    <div
                      className={
                        "messages-bubble" +
                        (msg.fromMe
                          ? " messages-bubble-me"
                          : " messages-bubble-them")
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {activeMessages.length === 0 && (
                  <div className="messages-empty">
                    No messages yet. Say hi and maybe send a clip or battle
                    invite.
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="messages-compose">
                <textarea
                  name="text"
                  className="messages-compose-input"
                  placeholder="Type your message…"
                  rows={2}
                />
                <button type="submit" className="messages-compose-send">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="messages-empty">
              Select someone from your inbox to start chatting.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
