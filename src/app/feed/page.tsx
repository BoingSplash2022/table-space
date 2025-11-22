"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthContext } from "../../context/AuthContext";

/* -------------------------------------------------
   Persistent Like Button (Feed)
-------------------------------------------------- */

function LikeButton({ postId, likes = 0 }: { postId: string; likes: number }) {
  const { user } = useAuthContext();
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(`liked-feed-${postId}`);
    if (stored === "true") setLiked(true);
  }, [postId]);

  const handleLike = async () => {
    if (!user || liked) return;

    setLiked(true);
    setCount((prev) => prev + 1);
    localStorage.setItem(`liked-feed-${postId}`, "true");

    try {
      const ref = doc(db, "feedPosts", postId);
      await updateDoc(ref, { likes: increment(1) });
    } catch (err) {
      console.error("Error liking feed post:", err);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!user || liked}
      className="
        flex items-center gap-2 ml-auto mt-2
        text-gray-700 hover:text-black
        transition-colors duration-150
      "
    >
      <span
        style={{ fontSize: "1.3rem" }}
        className={`
          inline-block transition-transform duration-200
          ${liked ? "scale-125" : "scale-100"}
        `}
      >
        {liked ? "❤️‍🔥" : "🖤"}
      </span>
      <span>Fuckin' Love It! ({count})</span>
    </button>
  );
}

/* -------------------------------------------------
   Types
-------------------------------------------------- */

type Mood = "practice" | "battle" | "clip" | "other";

type FeedPost = {
  id: string;
  handle: string;
  text: string;
  mood: Mood;
  createdAt: Date;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  mixcloudUrl?: string;
  instagramUrl?: string;
  likes: number;
};

type FeedPostFromDb = {
  handle?: string;
  text?: string;
  mood?: Mood;
  createdAt?: Timestamp;
  youtubeUrl?: string | null;
  soundcloudUrl?: string | null;
  mixcloudUrl?: string | null;
  instagramUrl?: string | null;
  likes?: number;
};

/* -------------------------------------------------
   Time util
-------------------------------------------------- */

function timeSince(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mins ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hours ago`;
  const days = Math.floor(hr / 24);
  return `${days} days ago`;
}

/* -------------------------------------------------
   EMBED HELPERS
-------------------------------------------------- */

// Instagram official embed
function InstagramEmbed({ url }: { url: string }) {
  // Normalise permalink so Instagram accepts it
  const clean = url.split("?")[0];

  useEffect(() => {
    // Load Instagram embed script
    if (!(window as any)?.instgrm) {
      const s = document.createElement("script");
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      document.body.appendChild(s);
    } else {
      (window as any).instgrm.Embeds.process();
    }
  }, [url]);

  return (
    <div className="feed-embed" style={{ width: "100%" }}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={clean}
        data-instgrm-version="14"
        style={{ margin: "1rem auto", width: "100%" }}
      ></blockquote>
    </div>
  );
}

// YouTube
function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;

    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      if (u.pathname.startsWith("/embed/")) return url;

      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1];
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function YoutubeEmbed({ url }: { url: string }) {
  const embedUrl = getYoutubeEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="feed-embed">
      <iframe className="embed-frame youtube" src={embedUrl} allowFullScreen />
    </div>
  );
}

// SoundCloud
function SoundcloudEmbed({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="feed-embed">
      <iframe
        className="embed-frame soundcloud"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`}
      />
    </div>
  );
}

// Mixcloud
function MixcloudEmbed({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="feed-embed">
      <iframe
        className="embed-frame mixcloud"
        src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=${encodeURIComponent(
          url
        )}`}
      />
    </div>
  );
}

/* -------------------------------------------------
   FEED PAGE
-------------------------------------------------- */

export default function FeedPage() {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [showForm, setShowForm] = useState(false);

  /* Load posts */
  useEffect(() => {
    const q = query(collection(db, "feedPosts"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows: FeedPost[] = snap.docs.map((d) => {
        const data = d.data() as FeedPostFromDb;

        return {
          id: d.id,
          handle: data.handle ?? "@yourdjname",
          text: data.text ?? "",
          mood: data.mood ?? "other",
          createdAt: data.createdAt?.toDate() ?? new Date(),
          youtubeUrl: data.youtubeUrl ?? undefined,
          soundcloudUrl: data.soundcloudUrl ?? undefined,
          mixcloudUrl: data.mixcloudUrl ?? undefined,
          instagramUrl: data.instagramUrl ?? undefined,
          likes: data.likes ?? 0,
        };
      });

      setPosts(rows);
    });

    return () => unsub();
  }, []);

  /* Submit post */
  async function handlePost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const handle = (fd.get("handle") as string)?.trim();
    const text = (fd.get("text") as string)?.trim();
    const mood = (fd.get("mood") as Mood) || "other";

    const youtubeUrl = (fd.get("youtubeUrl") as string)?.trim();
    const soundcloudUrl = (fd.get("soundcloudUrl") as string)?.trim();
    const mixcloudUrl = (fd.get("mixcloudUrl") as string)?.trim();
    const instagramUrl = (fd.get("instagramUrl") as string)?.trim();

    if (!handle || !text) return;
    if (!user) return alert("Please sign in first.");

    await addDoc(collection(db, "feedPosts"), {
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      text,
      mood,
      youtubeUrl: youtubeUrl || null,
      soundcloudUrl: soundcloudUrl || null,
      mixcloudUrl: mixcloudUrl || null,
      instagramUrl: instagramUrl || null,
      createdAt: serverTimestamp(),
      uid: user.uid,
      likes: 0,
    });

    form.reset();
    setShowForm(false);
  }

  /* ----------------------------- */

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Feed</h1>
        <p>Share what you're practicing or planning.</p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-3">
        <button
          className="messages-compose-send"
          style={{ minWidth: 180 }}
          onClick={() => setShowForm((p) => !p)}
        >
          {showForm ? "Cancel post ⌃" : "Drop post ⌄"}
        </button>
      </div>

      {/* Composer */}
      {showForm && (
        <section className="feed-form">
          <form onSubmit={handlePost} className="feed-form-inner">
            <div className="feed-form-row">
              <div className="feed-field">
                <label>Handle</label>
                <input name="handle" type="text" className="feed-input" required />
              </div>

              <div className="feed-field" style={{ maxWidth: 180 }}>
                <label>Type</label>
                <select name="mood" className="feed-select">
                  <option value="practice">Practice</option>
                  <option value="battle">Battle</option>
                  <option value="clip">Clip</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="feed-field">
              <label>Post</label>
              <textarea name="text" className="feed-textarea" required />
            </div>

            <div className="feed-field">
              <label>YouTube link</label>
              <input name="youtubeUrl" type="url" className="feed-input" />
            </div>

            <div className="feed-field">
              <label>Instagram link</label>
              <input name="instagramUrl" type="url" className="feed-input" placeholder="Public Reel/Post URL"/>
            </div>

            <div className="feed-form-row">
              <div className="feed-field">
                <label>SoundCloud link</label>
                <input name="soundcloudUrl" type="url" className="feed-input" />
              </div>

              <div className="feed-field">
                <label>Mixcloud link</label>
                <input name="mixcloudUrl" type="url" className="feed-input" />
              </div>
            </div>

            <button type="submit" className="feed-submit">
              Drop post
            </button>
          </form>
        </section>
      )}

      {/* FEED LIST */}
      <section className="feed-list">
        {posts.map((post) => {
          const initial =
            post.handle.replace("@", "").charAt(0).toUpperCase() || "D";

          return (
            <article key={post.id} className="feed-post">
              <div className="feed-avatar">{initial}</div>

              <div className="feed-post-body">
                <div className="feed-post-header">
                  <span className="feed-handle">{post.handle}</span>
                  <span className="feed-time">{timeSince(post.createdAt)}</span>
                </div>

                <p className="feed-text">{post.text}</p>

                {post.youtubeUrl && <YoutubeEmbed url={post.youtubeUrl} />}
                {post.instagramUrl && <InstagramEmbed url={post.instagramUrl} />}
                {post.soundcloudUrl && <SoundcloudEmbed url={post.soundcloudUrl} />}
                {post.mixcloudUrl && <MixcloudEmbed url={post.mixcloudUrl} />}

                <LikeButton postId={post.id} likes={post.likes} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
