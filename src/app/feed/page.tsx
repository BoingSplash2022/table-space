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
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthContext } from "../../context/AuthContext";

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
};

type FeedPostFromDb = {
  handle?: string;
  text?: string;
  mood?: Mood;
  createdAt?: Timestamp;
  youtubeUrl?: string | null;
  soundcloudUrl?: string | null;
  mixcloudUrl?: string | null;
};

function timeSince(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// --- EMBED HELPERS ----------------------------------------------------

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
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
      <iframe
        className="embed-frame youtube"
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function SoundcloudEmbed({ url }: { url: string }) {
  if (!url) return null;
  const playerUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    url
  )}&color=%23000000&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
  return (
    <div className="feed-embed">
      <iframe
        className="embed-frame soundcloud"
        src={playerUrl}
        allow="autoplay"
        loading="lazy"
      />
    </div>
  );
}

function MixcloudEmbed({ url }: { url: string }) {
  if (!url) return null;
  const widgetUrl = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=${encodeURIComponent(
    url
  )}`;
  return (
    <div className="feed-embed">
      <iframe className="embed-frame mixcloud" src={widgetUrl} loading="lazy" />
    </div>
  );
}

// --- TEXT AUTO-DETECTION ----------------------------------------------

type DetectedMedia = {
  textWithoutLinks: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  mixcloudUrl?: string;
};

function detectMediaLinks(rawText: string): DetectedMedia {
  const urlRegex = /https?:\/\/\S+/gi;
  const urls = rawText.match(urlRegex) ?? [];

  let youtubeUrl: string | undefined;
  let soundcloudUrl: string | undefined;
  let mixcloudUrl: string | undefined;

  for (const raw of urls) {
    try {
      const u = new URL(raw);

      const host = u.hostname.toLowerCase();

      if (!youtubeUrl && (host.includes("youtube.com") || host.includes("youtu.be"))) {
        youtubeUrl = raw;
      } else if (!soundcloudUrl && host.includes("soundcloud.com")) {
        soundcloudUrl = raw;
      } else if (!mixcloudUrl && host.includes("mixcloud.com")) {
        mixcloudUrl = raw;
      }
    } catch {
      // ignore malformed URLs
    }
  }

  // strip all URLs from the text so we don't show them twice
  const textWithoutLinks = rawText.replace(urlRegex, "").replace(/\s{2,}/g, " ").trim();

  return { textWithoutLinks, youtubeUrl, soundcloudUrl, mixcloudUrl };
}

// ----------------------------------------------------------------------

export default function FeedPage() {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<FeedPost[]>([]);

  // Live feed from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "feedPosts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows: FeedPost[] = snap.docs.map((docSnap) => {
        const data = docSnap.data() as FeedPostFromDb;
        return {
          id: docSnap.id,
          handle: data.handle ?? "@yourdjname",
          text: data.text ?? "",
          mood: data.mood ?? "other",
          createdAt: data.createdAt?.toDate() ?? new Date(),
          youtubeUrl: data.youtubeUrl ?? undefined,
          soundcloudUrl: data.soundcloudUrl ?? undefined,
          mixcloudUrl: data.mixcloudUrl ?? undefined,
        };
      });

      setPosts(rows);
    });

    return () => unsub();
  }, []);

  async function handlePost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const handle = (formData.get("handle") as string)?.trim();
    const rawText = (formData.get("text") as string)?.trim();
    const mood = (formData.get("mood") as Mood) || "other";

    // Optional explicit fields
    let youtubeUrl = (formData.get("youtubeUrl") as string)?.trim();
    let soundcloudUrl = (formData.get("soundcloudUrl") as string)?.trim();
    let mixcloudUrl = (formData.get("mixcloudUrl") as string)?.trim();

    if (!handle || !rawText) return;
    if (!user) {
      alert("Please sign in to post to the feed.");
      return;
    }

    // Auto-detect links in the text if explicit fields are empty
    let finalText = rawText;
    if (!youtubeUrl && !soundcloudUrl && !mixcloudUrl) {
      const detected = detectMediaLinks(rawText);
      finalText = detected.textWithoutLinks || rawText;

      youtubeUrl = detected.youtubeUrl ?? "";
      soundcloudUrl = detected.soundcloudUrl ?? "";
      mixcloudUrl = detected.mixcloudUrl ?? "";
    }

    await addDoc(collection(db, "feedPosts"), {
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      text: finalText,
      mood,
      youtubeUrl: youtubeUrl || null,
      soundcloudUrl: soundcloudUrl || null,
      mixcloudUrl: mixcloudUrl || null,
      createdAt: serverTimestamp(),
      uid: user.uid,
    });

    form.reset();
  }

  return (
    <div className="feed">
      {/* Header */}
      <div className="feed-header">
        <h1>Feed</h1>
        <p>Share what you&apos;re practicing, planning or battling.</p>
      </div>

      {/* Composer */}
      <section className="feed-form">
        <form onSubmit={handlePost} className="feed-form-inner">
          <div className="feed-form-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="handle">
                Handle
              </label>
              <input
                id="handle"
                name="handle"
                type="text"
                className="feed-input"
                placeholder="@yourdjname"
                required
              />
            </div>
            <div className="feed-field" style={{ maxWidth: 180 }}>
              <label className="feed-label" htmlFor="mood">
                Type
              </label>
              <select
                id="mood"
                name="mood"
                className="feed-select"
                defaultValue="practice"
              >
                <option value="practice">Practice</option>
                <option value="battle">Battle</option>
                <option value="clip">New clip</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="feed-field">
            <label className="feed-label" htmlFor="text">
              Post
            </label>
            <textarea
              id="text"
              name="text"
              className="feed-textarea"
              placeholder="What are you working on today? (Paste YouTube / SoundCloud / Mixcloud links here or use the fields below.)"
              required
            />
          </div>

          {/* Explicit media link fields – optional, override auto-detect */}
          <div className="feed-form-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="youtubeUrl">
                YouTube link (optional)
              </label>
              <input
                id="youtubeUrl"
                name="youtubeUrl"
                type="url"
                className="feed-input"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div className="feed-form-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="soundcloudUrl">
                SoundCloud link (optional)
              </label>
              <input
                id="soundcloudUrl"
                name="soundcloudUrl"
                type="url"
                className="feed-input"
                placeholder="https://soundcloud.com/your-track"
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="mixcloudUrl">
                Mixcloud link (optional)
              </label>
              <input
                id="mixcloudUrl"
                name="mixcloudUrl"
                type="url"
                className="feed-input"
                placeholder="https://www.mixcloud.com/your-mix"
              />
            </div>
          </div>

          <div className="feed-submit-row">
            <button type="submit" className="feed-submit">
              Drop post
            </button>
          </div>
        </form>
      </section>

      {/* Feed list */}
      <section className="feed-list">
        {posts.map((post) => {
          const initial =
            post.handle.replace("@", "").trim().charAt(0).toUpperCase() ||
            "D";

          let moodLabel: string | undefined;
          let moodClass = "feed-mood";

          if (post.mood === "practice") {
            moodLabel = "Practice";
            moodClass += " practice";
          } else if (post.mood === "battle") {
            moodLabel = "Battle";
            moodClass += " battle";
          } else if (post.mood === "clip") {
            moodLabel = "New Clip";
            moodClass += " clip";
          }

          return (
            <article key={post.id} className="feed-post">
              <div className="feed-avatar">{initial}</div>

              <div className="feed-post-body">
                <div className="feed-post-header">
                  <span className="feed-handle">{post.handle}</span>
                  <span className="feed-time">
                    {timeSince(post.createdAt)}
                  </span>
                  {moodLabel && (
                    <span className={moodClass}>{moodLabel}</span>
                  )}
                </div>

                <p className="feed-text">{post.text}</p>

                {post.youtubeUrl && <YoutubeEmbed url={post.youtubeUrl} />}
                {post.soundcloudUrl && (
                  <SoundcloudEmbed url={post.soundcloudUrl} />
                )}
                {post.mixcloudUrl && <MixcloudEmbed url={post.mixcloudUrl} />}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
