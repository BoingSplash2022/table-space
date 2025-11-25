"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthContext } from "../../context/AuthContext";

/* ----------------------------------------------------
   LIKE BUTTON
---------------------------------------------------- */
function LikeButton({ battleId, likes }: { battleId: string; likes: number }) {
  const { user } = useAuthContext();
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`liked-battle-${battleId}`);
    if (stored === "true") setLiked(true);
  }, [battleId]);

  const handleLike = async () => {
    if (!user || liked) return;

    setLiked(true);
    setCount((prev) => prev + 1);
    localStorage.setItem(`liked-battle-${battleId}`, "true");

    try {
      await updateDoc(doc(db, "battles", battleId), { likes: increment(1) });
    } catch (err) {
      console.error("Error liking battle:", err);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!user || liked}
      className="flex items-center justify-center gap-2 mt-4 text-gray-700 hover:text-black transition w-full"
    >
      <span
        style={{ fontSize: "1.5rem" }}
        className={`transition-transform ${liked ? "scale-125" : "scale-100"}`}
      >
        {liked ? "❤️‍🔥" : "🖤"}
      </span>
      <span>Fuckin' Love It! ({count})</span>
    </button>
  );
}

/* ----------------------------------------------------
   COMMENTS SECTION — SUBTLE GREY PILL BUTTONS
---------------------------------------------------- */
function CommentsSection({ battleId }: { battleId: string }) {
  const { user, activeProfile } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<
    { id: string; uid: string; handle: string; text: string; createdAt: Date }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");

  const loadComments = () => {
    if (loading || open) return;

    setOpen(true);
    setLoading(true);

    const ref = collection(db, "battles", battleId, "comments");
    const q = query(ref, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        uid: d.data().uid,
        handle: d.data().handle,
        text: d.data().text,
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
      }));

      setComments(rows);
      setLoading(false);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !activeProfile) return;
    if (!newComment.trim()) return;

    await addDoc(collection(db, "battles", battleId, "comments"), {
      uid: user.uid,
      handle: activeProfile.handle,
      text: newComment.trim(),
      createdAt: serverTimestamp(),
    });

    setNewComment("");
  };

  return (
    <div className="mt-5 border-t border-gray-300 pt-4">

      {/* ------- Toggle button (STYLE C — Subtle Grey Pill) ------- */}
      {!open && (
        <button
          onClick={loadComments}
          className="
            text-sm px-4 py-1 rounded-full
            bg-gray-200 text-gray-700
            hover:bg-gray-300 transition
          "
        >
          Show comments ↓
        </button>
      )}

      {open && (
        <>
          <button
            onClick={() => setOpen(false)}
            className="
              text-sm px-4 py-1 rounded-full
              bg-gray-200 text-gray-700
              hover:bg-gray-300 transition mb-2
            "
          >
            Hide comments ↑
          </button>

          {loading && (
            <p className="text-sm text-gray-500">Loading…</p>
          )}

          {/* comment list */}
          {comments.length === 0 && !loading && (
            <p className="text-sm text-gray-500 mb-3">No comments yet.</p>
          )}

          {comments.map((c) => (
            <div
              key={c.id}
              className="mb-2 p-2 rounded bg-gray-100 border border-gray-200"
            >
              <div className="font-semibold text-sm">{c.handle}</div>
              <div className="text-sm">{c.text}</div>
            </div>
          ))}

          {/* comment form */}
          {user && (
            <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
              <input
                className="feed-input flex-1"
                placeholder="Write a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="feed-submit px-4">
                Post
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   YOUTUBE EMBED
---------------------------------------------------- */
function getYouTubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/"))
        return u.pathname.split("/shorts/")[1]?.split("?")[0] || null;
    }
  } catch {}
  return null;
}

/* ----------------------------------------------------
   MAIN BATTLES PAGE
---------------------------------------------------- */
export default function BattlesPage() {
  const { user, activeProfile } = useAuthContext();

  const [form, setForm] = useState({
    title: "",
    conditions: "",
    opponentHandle: "",
    clipAUrl: "",
    clipBUrl: "",
  });

  const [battles, setBattles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [voteState, setVoteState] = useState(() => {
    if (typeof window === "undefined") return {};
    return JSON.parse(localStorage.getItem("battleVotes") || "{}");
  });

  useEffect(() => {
    localStorage.setItem("battleVotes", JSON.stringify(voteState));
  }, [voteState]);

  useEffect(() => {
    const q = query(collection(db, "battles"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBattles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !activeProfile) return;

    setCreating(true);

    await addDoc(collection(db, "battles"), {
      title: form.title,
      conditions: form.conditions,
      opponentHandle: form.opponentHandle || "Opponent",
      creatorUid: user.uid,
      creatorHandle: activeProfile.handle,
      clipAUrl: form.clipAUrl,
      clipBUrl: form.clipBUrl,
      votesA: 0,
      votesB: 0,
      likes: 0,
      createdAt: serverTimestamp(),
    });

    setForm({
      title: "",
      conditions: "",
      opponentHandle: "",
      clipAUrl: "",
      clipBUrl: "",
    });

    setShowingForm: false;
    setCreating(false);
  };

  const handleVote = async (battleId: string, side: "A" | "B") => {
    if (!user) return;

    const v = voteState[battleId] ?? { a: false, b: false };
    if ((side === "A" && v.a) || (side === "B" && v.b)) return;

    const ref = doc(db, "battles", battleId);
    await updateDoc(ref, {
      [side === "A" ? "votesA" : "votesB"]: increment(1),
    });

    setVoteState((prev: any) => ({
      ...prev,
      [battleId]: { ...v, [side.toLowerCase()]: true },
    }));
  };

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Battles</h1>
      </div>

      {/* create-toggle */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => setShowForm((p) => !p)}
          className="messages-compose-send"
        >
          {showForm ? "Cancel battle ⌃" : "Create battle ⌄"}
        </button>
      </div>

      {/* create form */}
      {showForm && (
        <section className="feed-form">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              className="feed-input"
              placeholder="Battle title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              className="feed-textarea"
              placeholder="Rules / conditions"
              value={form.conditions}
              onChange={(e) =>
                setForm({ ...form, conditions: e.target.value })
              }
            />

            <input
              className="feed-input"
              placeholder="Opponent handle"
              value={form.opponentHandle}
              onChange={(e) =>
                setForm({ ...form, opponentHandle: e.target.value })
              }
            />

            <input
              className="feed-input"
              placeholder="Your clip (YouTube URL)"
              value={form.clipAUrl}
              onChange={(e) =>
                setForm({ ...form, clipAUrl: e.target.value })
              }
            />

            <input
              className="feed-input"
              placeholder="Opponent clip (YouTube URL)"
              value={form.clipBUrl}
              onChange={(e) =>
                setForm({ ...form, clipBUrl: e.target.value })
              }
            />

            <button className="feed-submit" disabled={creating}>
              {creating ? "Creating…" : "Create battle"}
            </button>
          </form>
        </section>
      )}

      {/* battles list */}
      <section className="clips-list">
        {battles.map((battle) => {
          const voted = voteState[battle.id] ?? { a: false, b: false };
          const embedA = getYouTubeEmbedId(battle.clipAUrl);
          const embedB = getYouTubeEmbedId(battle.clipBUrl);

          return (
            <article key={battle.id} className="clip-card">
              <div className="clip-title">{battle.title}</div>
              <p>{battle.conditions}</p>

              <div className="battle-videos">
                <div className="battle-side">
                  {embedA && (
                    <iframe
                      className="embed-frame youtube"
                      src={`https://www.youtube.com/embed/${embedA}`}
                      allowFullScreen
                    />
                  )}
                  <button
                    onClick={() => handleVote(battle.id, "A")}
                    disabled={!user || voted.a}
                    className="battle-vote-btn"
                  >
                    {voted.a ? "Voted" : "Vote"}
                  </button>
                </div>

                <div className="battle-side">
                  {embedB && (
                    <iframe
                      className="embed-frame youtube"
                      src={`https://www.youtube.com/embed/${embedB}`}
                      allowFullScreen
                    />
                  )}
                  <button
                    onClick={() => handleVote(battle.id, "B")}
                    disabled={!user || voted.b}
                    className="battle-vote-btn"
                  >
                    {voted.b ? "Voted" : "Vote"}
                  </button>
                </div>
              </div>

              <LikeButton battleId={battle.id} likes={battle.likes} />

              {/* NEW pill-style comments */}
              <CommentsSection battleId={battle.id} />
            </article>
          );
        })}
      </section>
    </div>
  );
}
