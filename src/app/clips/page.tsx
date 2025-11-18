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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";

type ClipPlatform = "youtube" | "soundcloud" | "mixcloud" | "other";

type ClipDocFromDb = {
  handle?: string;
  title?: string;
  url?: string;
  platform?: ClipPlatform;
  description?: string;
  createdAt?: Timestamp;
  uid?: string;
};

type Clip = {
  id: string;
  handle: string;
  title: string;
  url: string;
  platform: ClipPlatform;
  description?: string;
  createdAt: Date | null;
};

// ------------ time util ------------

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

// ------------ embed helpers ------------

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

// ------------ main page ------------

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

  // Prefill handle from active profile
  useEffect(() => {
    if (activeProfile?.handle) {
      setHandle((prev) => prev || activeProfile.handle);
    }
  }, [activeProfile]);

  // Load clips from Firestore
  useEffect(() => {
    const ref = collection(db, "clips");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Clip[] = snap.docs.map((d) => {
          const data = d.data() as ClipDocFromDb;
          return {
            id: d.id,
            handle: data.handle ?? "@yourdjname",
            title: data.title ?? "",
            url: data.url ?? "",
            platform: data.platform ?? "youtube",
            description: data.description ?? "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });
        setClips(rows);
      },
      (err) => {
        console.error("Error loading clips", err);
      }
    );

    return () => unsub();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedHandle = handle.trim();
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedHandle || !trimmedTitle || !trimmedUrl) {
      setErrorMessage("Please fill in handle, title and link.");
      return;
    }

    if (!user) {
      setErrorMessage("Please sign in to post a clip.");
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "clips"), {
        handle: trimmedHandle.startsWith("@")
          ? trimmedHandle
          : `@${trimmedHandle}`,
        title: trimmedTitle,
        url: trimmedUrl,
        platform,
        description: description.trim() || "",
        createdAt: serverTimestamp(),
        uid: user.uid,
      });

      // reset & collapse
      setTitle("");
      setUrl("");
      setDescription("");
      setPlatform("youtube");
      if (activeProfile?.handle) {
        setHandle(activeProfile.handle);
      }

      setShowForm(false);
    } catch (err) {
      console.error("Error posting clip", err);
      setErrorMessage("Could not post clip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onHandleChange(e: ChangeEvent<HTMLInputElement>) {
    setHandle(e.target.value);
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Clips</h1>
        <p>Share scratch clips, routines and practice sessions.</p>
      </div>

      {/* Centered toggle button */}
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="messages-compose-send"
          style={{ minWidth: "180px", textAlign: "center" }}
        >
          {showForm ? "Cancel clip ⌃" : "Add new clip ⌄"}
        </button>
      </div>

      {/* Composer (collapsible) */}
      {showForm && (
        <section className="feed-form">
          <form onSubmit={handleSubmit} className="feed-form-inner">
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
                  value={handle}
                  onChange={onHandleChange}
                />
              </div>

              <div className="feed-field" style={{ maxWidth: 200 }}>
                <label className="feed-label" htmlFor="platform">
                  Platform
                </label>
                <select
                  id="platform"
                  name="platform"
                  className="feed-select"
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as ClipPlatform)
                  }
                >
                  <option value="youtube">YouTube</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="mixcloud">Mixcloud</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="title">
                Clip title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="feed-input"
                placeholder="Routine name / practice theme"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="url">
                Clip link
              </label>
              <input
                id="url"
                name="url"
                type="url"
                className="feed-input"
                placeholder="Paste YouTube / SoundCloud / Mixcloud / other link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="description">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                className="feed-textarea"
                rows={3}
                placeholder="Setup, gear, tempo, routine notes, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {errorMessage && (
              <p className="auth-error" style={{ marginTop: "0.5rem" }}>
                {errorMessage}
              </p>
            )}

            <div className="feed-submit-row" style={{ marginTop: "0.75rem" }}>
              <button
                type="submit"
                className="feed-submit"
                disabled={submitting}
              >
                {submitting ? "Posting…" : "Post clip"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Clips list */}
      <section className="feed-list">
        {clips.map((clip) => {
          const initial =
            clip.handle.replace("@", "").trim().charAt(0).toUpperCase() || "D";

          const timeLabel = timeSince(clip.createdAt);

          return (
            <article key={clip.id} className="feed-post">
              <div className="feed-avatar">{initial}</div>

              <div className="feed-post-body">
                <div className="feed-post-header">
                  <span className="feed-handle">{clip.handle}</span>
                  {timeLabel && (
                    <span className="feed-time">{timeLabel}</span>
                  )}
                  <span className="feed-mood clip">Clip</span>
                </div>

                {clip.title && (
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {clip.title}
                  </h3>
                )}

                {clip.description && (
                  <p className="feed-text" style={{ marginBottom: "0.35rem" }}>
                    {clip.description}
                  </p>
                )}

                {clip.platform === "youtube" && <YoutubeEmbed url={clip.url} />}
                {clip.platform === "soundcloud" && (
                  <SoundcloudEmbed url={clip.url} />
                )}
                {clip.platform === "mixcloud" && (
                  <MixcloudEmbed url={clip.url} />
                )}
                {clip.platform === "other" && (
                  <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="buy-link"
                  >
                    Open clip
                  </a>
                )}
              </div>
            </article>
          );
        })}

        {clips.length === 0 && (
          <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            No clips yet. Add one with the button above.
          </p>
        )}
      </section>
    </div>
  );
}



