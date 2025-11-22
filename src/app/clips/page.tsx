// Updated ClipsPage with Like button feature + Instagram embed
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";

/* -------------------------------------------------
   Animated Like Button
-------------------------------------------------- */

function LikeButton({ clipId, likes = 0 }: { clipId: string; likes: number }) {
  const { user } = useAuthContext();
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    if (!user || liked) return;
    setLiked(true);
    setCount((prev) => prev + 1);

    try {
      const ref = doc(db, "clips", clipId);
      await updateDoc(ref, { likes: increment(1) });
    } catch (err) {
      console.error("Error liking clip", err);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!user || liked}
      className="
        flex items-center gap-2 ml-auto mt-2
        text-gray-700 hover:text-black transition-colors duration-150
      "
    >
      <span
        style={{ fontSize: "1.3rem" }}
        className={`inline-block transition-transform duration-200 ${
          liked ? "scale-125" : "scale-100"
        }`}
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

type ClipPlatform = "youtube" | "soundcloud" | "mixcloud" | "other";

type ClipDocFromDb = {
  handle?: string;
  title?: string;
  url?: string;
  platform?: ClipPlatform;
  description?: string;
  createdAt?: Timestamp;
  uid?: string;
  likes?: number;
};

type Clip = {
  id: string;
  handle: string;
  title: string;
  url: string;
  platform: ClipPlatform;
  description?: string;
  createdAt: Date | null;
  likes: number;
};

/* -------------------------------------------------
   Time util
-------------------------------------------------- */

function timeSince(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* -------------------------------------------------
   INSTAGRAM EMBED
-------------------------------------------------- */

function InstagramEmbed({ url }: { url: string }) {
  const clean = url.split("?")[0];

  useEffect(() => {
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

/* -------------------------------------------------
   YouTube Embed Helper
-------------------------------------------------- */

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;

    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("?")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
  } catch {}
  return null;
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
   Main Page
-------------------------------------------------- */

export default function ClipsPage() {
  const { user, activeProfile } = useAuthContext();

  const [clips, setClips] = useState<Clip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<ClipPlatform>("youtube");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Prefill handle */
  useEffect(() => {
    if (activeProfile?.handle) setHandle(activeProfile.handle);
  }, [activeProfile]);

  /* Load clips */
  useEffect(() => {
    const ref = collection(db, "clips");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      setClips(
        snap.docs.map((d) => {
          const data = d.data() as ClipDocFromDb;
          return {
            id: d.id,
            handle: data.handle ?? "@yourdjname",
            title: data.title ?? "",
            url: data.url ?? "",
            platform: data.platform ?? "youtube",
            description: data.description ?? "",
            createdAt: data.createdAt?.toDate() ?? null,
            likes: data.likes ?? 0,
          };
        })
      );
    });

    return () => unsub();
  }, []);

  /* Submit new clip */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!handle.trim() || !title.trim() || !url.trim()) {
      setErrorMessage("Please fill in handle, title, and link.");
      return;
    }

    if (!user) {
      setErrorMessage("Please sign in to post a clip.");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "clips"), {
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        title,
        url,
        platform,
        description,
        createdAt: serverTimestamp(),
        uid: user.uid,
        likes: 0,
      });

      setTitle("");
      setUrl("");
      setDescription("");
      setPlatform("youtube");
      if (activeProfile?.handle) setHandle(activeProfile.handle);

      setShowForm(false);
    } catch (err) {
      console.error("Clip posting failed:", err);
      setErrorMessage("Could not post clip. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------- */

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Clips</h1>
        <p>Share scratch clips, routines, and practice sessions.</p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-3">
        <button
          type="button"
          className="messages-compose-send"
          style={{ minWidth: 180 }}
          onClick={() => setShowForm((p) => !p)}
        >
          {showForm ? "Cancel clip ⌃" : "Add new clip ⌄"}
        </button>
      </div>

      {/* Composer */}
      {showForm && (
        <section className="feed-form">
          <form onSubmit={handleSubmit} className="feed-form-inner">
            <div className="feed-form-row">
              <div className="feed-field">
                <label>Handle</label>
                <input
                  type="text"
                  className="feed-input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>

              <div className="feed-field" style={{ maxWidth: 200 }}>
                <label>Platform</label>
                <select
                  className="feed-select"
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as ClipPlatform)
                  }
                >
                  <option value="youtube">YouTube</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="mixcloud">Mixcloud</option>
                  <option value="other">Other / Instagram</option>
                </select>
              </div>
            </div>

            <div className="feed-field">
              <label>Clip title</label>
              <input
                type="text"
                className="feed-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="feed-field">
              <label>Clip link</label>
              <input
                type="url"
                className="feed-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube / Insta Reel / SoundCloud / Mixcloud"
              />
            </div>

            <div className="feed-field">
              <label>Description (optional)</label>
              <textarea
                className="feed-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {errorMessage && (
              <p className="auth-error">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="feed-submit"
              disabled={submitting}
            >
              {submitting ? "Posting…" : "Post clip"}
            </button>
          </form>
        </section>
      )}

      {/* Clips List */}
      <section className="feed-list">
        {clips.map((clip) => {
          const initial =
            clip.handle.replace("@", "").charAt(0).toUpperCase() || "D";

          /* Instagram detection */
          const isInstagram =
            clip.url.includes("instagram.com/reel") ||
            clip.url.includes("instagram.com/p") ||
            clip.url.includes("instagram.com");

          return (
            <article key={clip.id} className="feed-post">
              <div className="feed-avatar">{initial}</div>

              <div className="feed-post-body">
                <div className="feed-post-header">
                  <span className="feed-handle">{clip.handle}</span>
                  <span className="feed-time">
                    {timeSince(clip.createdAt)}
                  </span>
                  <span className="feed-mood clip">Clip</span>
                </div>

                {clip.title && (
                  <h3 className="font-semibold mb-1">{clip.title}</h3>
                )}

                {clip.description && (
                  <p className="feed-text mb-2">{clip.description}</p>
                )}

                {/* INSTAGRAM */}
                {isInstagram && <InstagramEmbed url={clip.url} />}

                {/* YOUTUBE */}
                {!isInstagram && clip.platform === "youtube" && (
                  <YoutubeEmbed url={clip.url} />
                )}

                {/* SOUNDCLOUD */}
                {!isInstagram && clip.platform === "soundcloud" && (
                  <SoundcloudEmbed url={clip.url} />
                )}

                {/* MIXCLOUD */}
                {!isInstagram && clip.platform === "mixcloud" && (
                  <MixcloudEmbed url={clip.url} />
                )}

                {/* OTHER LINKS */}
                {!isInstagram && clip.platform === "other" && (
                  <a
                    href={clip.url}
                    target="_blank"
                    className="buy-link"
                    rel="noopener noreferrer"
                  >
                    Open clip
                  </a>
                )}

                {/* Like Button */}
                <div className="flex justify-end">
                  <LikeButton clipId={clip.id} likes={clip.likes} />
                </div>
              </div>
            </article>
          );
        })}

        {clips.length === 0 && (
          <p className="text-sm mt-4">No clips yet. Add one above.</p>
        )}
      </section>
    </div>
  );
}



