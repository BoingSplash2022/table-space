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

/* ============================================================
   UPDATED YouTube ID helper — now supports YouTube Shorts
   ============================================================ */
function getYouTubeEmbedId(url: string): string | null {
  try {
    const u = new URL(url);

    // youtu.be short link
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }

    // any YouTube domain
    if (u.hostname.includes("youtube.com") || u.hostname.includes("m.youtube.com")) {
      // Standard ?v=xxxx
      const v = u.searchParams.get("v");
      if (v) return v;

      // /embed/xxxx
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/embed/")[1] ?? null;
      }

      // /shorts/xxxx
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split("?")[0] ?? null;
      }
    }

  } catch {
    return null;
  }

  return null;
}

/* ============================================================
   Main Component
   ============================================================ */
export default function BattlesPage() {
  const { user, activeProfile } = useAuthContext();

  const [form, setForm] = useState<BattleFormState>(initialForm);
  const [creating, setCreating] = useState(false);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Track votes in localStorage
  const [voteState, setVoteState] = useState<VoteState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem("battleVotes");
      return raw ? (JSON.parse(raw) as VoteState) : {};
    } catch {
      return {};
    }
  });

  // Persist votes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("battleVotes", JSON.stringify(voteState));
    } catch {}
  }, [voteState]);

  // Load battles
  useEffect(() => {
    const q = query(collection(db, "battles"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Battle[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as BattleDoc;
        return {
          id: docSnap.id,
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
        };
      });
      setBattles(items);
    });

    return () => unsubscribe();
  }, []);

  /* ---------------------- form handlers ---------------------- */

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const already = voteState[battleId] ?? { a: false, b: false };
    if (side === "A" && already.a) return;
    if (side === "B" && already.b) return;

    const ref = doc(db, "battles", battleId);

    if (side === "A") {
      await updateDoc(ref, { votesA: increment(1) });
      setVoteState((prev) => ({
        ...prev,
        [battleId]: { ...already, a: true },
      }));
    } else {
      await updateDoc(ref, { votesB: increment(1) });
      setVoteState((prev) => ({
        ...prev,
        [battleId]: { ...already, b: true },
      }));
    }
  }

  const canCreate = Boolean(user && activeProfile);

  /* ============================================================
     Render
     ============================================================ */

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Battles</h1>
        <p>Set up scratch showdowns, share clips, and let the community vote.</p>
      </div>

      {/* Toggle create form */}
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setShowForm((p) => !p)}
          className="messages-compose-send"
          style={{ minWidth: "180px", textAlign: "center" }}
        >
          {showForm ? "Cancel battle ⌃" : "Create battle ⌄"}
        </button>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <section className="feed-form">
          <h2 className="profile-section-title">Create a battle</h2>
          {!canCreate && (
            <p className="auth-subnote">
              You need to be signed in and have a profile selected.
            </p>
          )}

          <form onSubmit={handleCreateBattle} className="space-y-3">
            <div className="feed-field">
              <label htmlFor="title" className="feed-label">
                Battle title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="feed-input"
                value={form.title}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="conditions">
                Rules / conditions
              </label>
              <textarea
                id="conditions"
                name="conditions"
                className="feed-textarea"
                rows={2}
                value={form.conditions}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="opponentHandle">
                Opponent handle (optional)
              </label>
              <input
                id="opponentHandle"
                name="opponentHandle"
                type="text"
                className="feed-input"
                value={form.opponentHandle}
                onChange={handleChange}
                disabled={!canCreate}
              />
            </div>

            <div className="feed-form-row">
              <div className="feed-field">
                <label className="feed-label" htmlFor="clipAUrl">
                  Your clip (YouTube URL)
                </label>
                <input
                  id="clipAUrl"
                  name="clipAUrl"
                  type="url"
                  className="feed-input"
                  value={form.clipAUrl}
                  onChange={handleChange}
                  disabled={!canCreate}
                />
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="clipBUrl">
                  Opponent clip (YouTube URL)
                </label>
                <input
                  id="clipBUrl"
                  name="clipBUrl"
                  type="url"
                  className="feed-input"
                  value={form.clipBUrl}
                  onChange={handleChange}
                  disabled={!canCreate}
                />
              </div>
            </div>

            <div className="feed-submit-row">
              <button
                type="submit"
                className="feed-submit"
                disabled={!canCreate || creating}
              >
                {creating ? "Creating…" : "Create battle"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* BATTLE LIST */}
      <section className="clips-list">
        {battles.map((battle) => {
          const embedAId = getYouTubeEmbedId(battle.clipAUrl);
          const embedBId = getYouTubeEmbedId(battle.clipBUrl);
          const voted = voteState[battle.id] ?? { a: false, b: false };

          return (
            <article key={battle.id} className="clip-card">
              <div className="clip-card-header">
                <div className="clip-title">{battle.title}</div>
                <div className="clip-meta">
                  Hosted by {battle.creatorHandle}
                  {battle.createdAt && (
                    <> · {battle.createdAt.toDate().toLocaleDateString()}</>
                  )}
                </div>
              </div>

              {battle.conditions && (
                <p className="clip-description">{battle.conditions}</p>
              )}

              <div className="battle-videos">
                {/* SIDE A */}
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
                      title="Battle clip A"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

                {/* SIDE B */}
                <div className="battle-side">
                  <div className="battle-side-header">
                    <span>{battle.opponentHandle || "Opponent"}</span>
                    <span>
                      {battle.votesB} vote{battle.votesB === 1 ? "" : "s"}
                    </span>
                  </div>

                  {embedBId && (
                    <iframe
                      className="embed-frame youtube"
                      src={`https://www.youtube.com/embed/${embedBId}`}
                      title="Battle clip B"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
            </article>
          );
        })}

        {battles.length === 0 && (
          <p className="messages-empty" style={{ marginTop: "0.75rem" }}>
            No battles yet. Be the first to throw down a challenge.
          </p>
        )}
      </section>
    </div>
  );
}



