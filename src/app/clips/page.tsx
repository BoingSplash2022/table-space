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
import { db, auth } from "@/lib/firebase";

type Platform = "youtube" | "soundcloud" | "mixcloud" | "other";

type ClipFromDb = {
  title?: string;
  url?: string;
  description?: string;
  platform?: Platform;
  handle?: string;
  uid?: string;
  createdAt?: Timestamp;
};

type Clip = {
  id: string;
  title: string;
  url: string;
  description: string;
  platform: Platform;
  handle: string;
  uid: string;
  createdAt: Date | null;
};

function timeSince(date: Date | null): string {
  if (!date) return "";
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

function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (u.includes("mixcloud.com")) return "mixcloud";
  return "other";
}

function buildEmbedSrc(url: string, platform: Platform): string | null {
  if (platform === "youtube") {
    // crude but works for normal YouTube / youtu.be URLs
    let videoId = "";
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        videoId = parsed.pathname.replace("/", "");
      } else {
        videoId = parsed.searchParams.get("v") ?? "";
      }
    } catch {
      // ignore parse errors
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (platform === "soundcloud") {
    const encoded = encodeURIComponent(url);
    return `https://w.soundcloud.com/player/?url=${encoded}`;
  }

  if (platform === "mixcloud") {
    // Mixcloud expects a "feed" path without https://www.mixcloud.com
    try {
      const parsed = new URL(url);
      const feed = encodeURIComponent(
        `${parsed.origin}${parsed.pathname}`
      );
      return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${feed}`;
    } catch {
      return null;
    }
  }

  return null;
}

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live subscription to clips
  useEffect(() => {
    const clipsRef = collection(db, "clips");
    const q = query(clipsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: Clip[] = snapshot.docs.map((doc) => {
          const data = doc.data() as ClipFromDb;
          return {
            id: doc.id,
            title: data.title ?? "",
            url: data.url ?? "",
            description: data.description ?? "",
            platform: data.platform ?? "other",
            handle: data.handle ?? "@unknown",
            uid: data.uid ?? "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });
        setClips(next);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading clips", err);
        setErrorMsg("Could not load clips.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg("You need to be signed in to post a clip.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const handle = (formData.get("handle") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const url = (formData.get("url") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    if (!handle || !title || !url) {
      setErrorMsg("Handle, title and URL are required.");
      return;
    }

    const platform = detectPlatform(url);

    try {
      await addDoc(collection(db, "clips"), {
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        title,
        url,
        description: description ?? "",
        platform,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      form.reset();
    } catch (err) {
      console.error("Error creating clip", err);
      setErrorMsg("Could not save clip. Please try again.");
    }
  }

  return (
    <div className="main-shell">
      {/* Header */}
      <header className="clips-header">
        <h1>Clips</h1>
        <p>Drop scratch sessions, beat juggles and battle routines.</p>
      </header>

      {/* Composer */}
      <section className="clips-form">
        <form onSubmit={handleSubmit} className="clips-form-inner">
          <div className="clips-form-row">
            <div className="clips-field">
              <label className="clips-label" htmlFor="handle">
                Handle
              </label>
              <input
                id="handle"
                name="handle"
                className="clips-input"
                placeholder="@yourdjname"
                type="text"
                required
              />
            </div>
            <div className="clips-field">
              <label className="clips-label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                className="clips-input"
                placeholder="Crab scratch combo"
                type="text"
                required
              />
            </div>
          </div>

          <div className="clips-form-row">
            <div className="clips-field">
              <label className="clips-label" htmlFor="url">
                Clip URL (YouTube, SoundCloud, Mixcloud)
              </label>
              <input
                id="url"
                name="url"
                className="clips-input"
                placeholder="https://youtube.com/..."
                type="url"
                required
              />
            </div>
          </div>

          <div className="clips-field">
            <label className="clips-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="clips-textarea"
              placeholder="Tempo, routine notes, gear, etc."
            />
          </div>

          <div className="clips-submit-row">
            <button type="submit" className="clips-submit">
              Add new clip
            </button>
          </div>

          {errorMsg && (
            <p className="auth-error" style={{ marginTop: "0.5rem" }}>
              {errorMsg}
            </p>
          )}
        </form>
      </section>

      {/* List */}
      <section>
        <h2 className="clips-header" style={{ marginBottom: "0.5rem" }}>
          Latest clips
        </h2>

        {loading && <p>Loading clips…</p>}

        {!loading && clips.length === 0 && (
          <p>No clips yet – be the first to post something.</p>
        )}

        <div className="clips-list">
          {clips.map((clip) => {
            const embedSrc = buildEmbedSrc(clip.url, clip.platform);
            const when = timeSince(clip.createdAt);

            return (
              <article key={clip.id} className="clip-card">
                <div className="clip-card-header">
                  <div>
                    <div className="clip-title">{clip.title}</div>
                    <div className="clip-meta">
                      {clip.handle}
                      {when ? ` · ${when}` : ""}
                    </div>
                  </div>
                  <div className="clip-meta" style={{ textTransform: "uppercase" }}>
                    {clip.platform === "other" ? "LINK" : clip.platform}
                  </div>
                </div>

                {clip.description && (
                  <p className="clip-description">{clip.description}</p>
                )}

                {embedSrc && (
                  <div className="clips-embed">
                    <iframe
                      src={embedSrc}
                      className={`embed-frame ${clip.platform}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={clip.title}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}


