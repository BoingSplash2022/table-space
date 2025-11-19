"use client";

import { FormEvent, useEffect, useState, ChangeEvent } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthContext } from "../../context/AuthContext";

/* ----------------------------------------------------
   Like Button (shared version, animated)
---------------------------------------------------- */
function LikeButton({ battleId, likes }: { battleId: string; likes: number }) {
  const { user } = useAuthContext();
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    if (!user || liked) return;

    setLiked(true);
    setCount((prev) => prev + 1);

    try {
      const ref = doc(db, "battles", battleId);
      await updateDoc(ref, { likes: increment(1) });
    } catch (err) {
      console.error("Error liking battle:", err);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!user || liked}
      className="
        flex items-center justify-center gap-2 mt-4
        text-gray-700 hover:text-black
        transition-colors duration-150 w-full
      "
    >
      <span
        style={{ fontSize: "1.5rem" }}
        className={`
          inline-block transition-transform duration-200
          ${liked ? "scale-125" : "scale-100"}
        `}
      >
        {liked ? "❤️‍🔥" : "🖤"}
      </span>

      <span className="text-sm font-medium">
        Fuckin' Love It! ({count})
      </span>
    </button>
  );
}

/* ----------------------------------------------------
   Types
---------------------------------------------------- */

type BattleDoc = {
  title: string;
  conditions: string;
  createdAt?: Timestamp;
  creatorUid: string;
  creatorHandle: string;
  opponentHandle: string;
  clipAUrl: string;
  clipBUrl: string;
  votesA?: number;
  votesB?: number;
  likes?: number;
};

type Battle = {
  id: string;
  title: string;
  conditions: string;
  createdAt: Timestamp | null;
  creatorUid: string;
  creatorHandle: string;
  opponentHandle: string;
  clipAUrl: string;
  clipBUrl: string;
  votesA: number;
  votesB: number;
  likes: number;
};

type BattleFormState = {
  title: string;
  conditions: string;
  opponentHandle: string;
  clipAUrl: string;
  clipBUrl: string;
};

const initialForm: BattleFormState = {
  title: "",
  conditions: "",
  opponentHandle: "",
  clipAUrl: "",
  clipBUrl: "",
};

type VoteState = {
  [battleId: string]: {
    a: boolean;
    b: boolean;
  };
};

/* ----------------------------------------------------
   YouTube Embed Helper (supports Shorts)
---------------------------------------------------- */

function getYouTubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }

    if (u.hostname.includes("youtube.com") || u.hostname.includes("m.youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;

      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.replace("/embed/", "");
      }

      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split("?")[0] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/* ----------------------------------------------------
   Main Component
---------------------------------------------------- */

export default function BattlesPage() {
  const { user, activeProfile } = useAuthContext();

  const [form, setForm] = useState<BattleFormState>(initialForm);
  const [creating, setCreating] = useState(false);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Track votes locally
  const [voteState, setVoteState] = useState<VoteState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("battleVotes");
      return raw ? (JSON.parse(raw) as VoteState) : {};
    } catch {
      return {};
    }
  });

  // Persist voteState
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("battleVotes", JSON.stringify(voteState));
  }, [voteState]);

  // Load battles
  useEffect(() => {
    const q = query(collection(db, "battles"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows: Battle[] = snap.docs.map((d) => {
        const data = d.data() as BattleDoc;
        return {
          id: d.id,
          title: data.title,
          conditions: data.conditions,
          createdAt: data.createdAt ?? null,
          creatorUid: data.creatorUid,
          creatorHandle: data.creatorHandle,
          opponentHandle: data.opponentHandle,
          clipAUrl: data.clipAUrl,
          clipBUrl: data.clipBUrl,
          votesA: data.votesA ?? 0,
          votesB: data.votesB ?? 0,
          likes: data.likes ?? 0,
        };
      });
      setBattles(rows);
    });

    return () => unsub();
  }, []);

  /* ----------------------------
     Form Handlers
  ---------------------------- */

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleCreateBattle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user || !activeProfile) return;

    const trimmed = {
      title: form.title.trim(),
      conditions: form.conditions.trim(),
      opponent: form.opponentHandle.trim(),
      a: form.clipAUrl.trim(),
      b: form.clipBUrl.trim(),
    };

    if (!trimmed.title || !trimmed.a || !trimmed.b) return;

    setCreating(true);

    try {
      await addDoc(collection(db, "battles"), {
        title: trimmed.title,
        conditions: trimmed.conditions,
        creatorUid: user.uid,
        creatorHandle: activeProfile.handle,
        opponentHandle: trimmed.opponent || "Opponent",
        clipAUrl: trimmed.a,
        clipBUrl: trimmed.b,
        votesA: 0,
        votesB: 0,
        likes: 0,
        createdAt: serverTimestamp(),
      });

      setForm(initialForm);
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(battleId: string, side: "A" | "B") {
    if (!user) return;

    const state = voteState[battleId] ?? { a: false, b: false };
    if ((side === "A" && state.a) || (side === "B" && state.b)) return;

    const ref = doc(db, "battles", battleId);

    if (side === "A") {
      await updateDoc(ref, { votesA: increment(1) });
      setVoteState((p) => ({ ...p, [battleId]: { ...state, a: true } }));
    } else {
      await updateDoc(ref, { votesB: increment(1) });
      setVoteState((p) => ({ ...p, [battleId]: { ...state, b: true } }));
    }
  }

  const canCreate = Boolean(user && activeProfile);

  /* ----------------------------------------------------
     Render
  ---------------------------------------------------- */

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Battles</h1>
        <p>Set up scratch showdowns, share clips, vote, and enjoy the hype.</p>
      </div>

      {/* Toggle Form */}
      <div className="flex justify-center mb-3">
        <button
          className="messages-compose-send"
          style={{ minWidth: 180 }}
          onClick={() => setShowForm((p) => !p)}
        >
          {showForm ? "Cancel battle ⌃" : "Create battle ⌄"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <section className="feed-form">
          <form onSubmit={handleCreateBattle} className="space-y-3">
            <div className="feed-field">
              <label>Battle title</label>
              <input
                name="title"
                className="feed-input"
                value={form.title}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-field">
              <label>Rules / conditions</label>
              <textarea
                name="conditions"
                className="feed-textarea"
                rows={2}
                value={form.conditions}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-field">
              <label>Opponent handle (optional)</label>
              <input
                name="opponentHandle"
                className="feed-input"
                value={form.opponentHandle}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-form-row">
              <div className="feed-field">
                <label>Your clip (YouTube)</label>
                <input
                  name="clipAUrl"
                  type="url"
                  className="feed-input"
                  value={form.clipAUrl}
                  onChange={handleChange}
                  disabled={!canCreate}
                />
              </div>

              <div className="feed-field">
                <label>Opponent clip (YouTube)</label>
                <input
                  name="clipBUrl"
                  type="url"
                  className="feed-input"
                  value={form.clipBUrl}
                  onChange={handleChange}
                  disabled={!canCreate}
                />
              </div>
            </div>

            <button
              type="submit"
              className="feed-submit"
              disabled={!canCreate || creating}
            >
              {creating ? "Creating…" : "Create battle"}
            </button>
          </form>
        </section>
      )}

      {/* Battle List */}
      <section className="clips-list">
        {battles.map((battle) => {
          const embedAId = getYouTubeEmbedId(battle.clipAUrl);
          const embedBId = getYouTubeEmbedId(battle.clipBUrl);

          const voted = voteState[battle.id] ?? { a: false, b: false };

          return (
            <article key={battle.id} className="clip-card">
              {/* Header */}
              <div className="clip-card-header">
                <div className="clip-title">{battle.title}</div>
                <div className="clip-meta">
                  Hosted by {battle.creatorHandle}
                  {battle.createdAt && (
                    <> · {battle.createdAt.toDate().toLocaleDateString()}</>
                  )}
                </div>
              </div>

              {/* Conditions */}
              {battle.conditions && (
                <p className="clip-description">{battle.conditions}</p>
              )}

              {/* Videos */}
              <div className="battle-videos">
                {/* Side A */}
                <div className="battle-side">
                  <div className="battle-side-header">
                    <span>{battle.creatorHandle}</span>
                    <span>
                      {battle.votesA} vote{battle.votesA === 1 ? "" : "s"}
                    </span>
                  </div>

                  {embedAId && (
                    <iframe
                      className="embed-frame youtube"
                      src={`https://www.youtube.com/embed/${embedAId}`}
                      allowFullScreen
                    />
                  )}

                  <button
                    type="button"
                    className="battle-vote-btn"
                    onClick={() => handleVote(battle.id, "A")}
                    disabled={!user || voted.a}
                  >
                    {voted.a ? "Voted" : `Vote for ${battle.creatorHandle}`}
                  </button>
                </div>

                {/* Side B */}
                <div className="battle-side">
                  <div className="battle-side-header">
                    <span>{battle.opponentHandle}</span>
                    <span>
                      {battle.votesB} vote{battle.votesB === 1 ? "" : "s"}
                    </span>
                  </div>

                  {embedBId && (
                    <iframe
                      className="embed-frame youtube"
                      src={`https://www.youtube.com/embed/${embedBId}`}
                      allowFullScreen
                    />
                  )}

                  <button
                    type="button"
                    className="battle-vote-btn"
                    onClick={() => handleVote(battle.id, "B")}
                    disabled={!user || voted.b}
                  >
                    {voted.b
                      ? "Voted"
                      : `Vote for ${battle.opponentHandle || "Opponent"}`}
                  </button>
                </div>
              </div>

              {/* ❤️ LIKE BUTTON — centered under whole card */}
              <LikeButton battleId={battle.id} likes={battle.likes} />
            </article>
          );
        })}
      </section>
    </div>
  );
}


