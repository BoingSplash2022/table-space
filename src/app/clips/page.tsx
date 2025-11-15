"use client";

import { FormEvent, useState } from "react";

type Platform = "youtube" | "soundcloud" | "mixcloud" | "other";

type Clip = {
  id: number;
  handle: string;
  title: string;
  description?: string;
  createdAt: Date;
  platform: Platform;
  mediaUrl?: string;
  embedUrl?: string;
};

const initialClips: Clip[] = [
  {
    id: 1,
    handle: "@djexample",
    title: "Crab scratch combo",
    description: "Quick combo on the 1200s.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    platform: "youtube",
    mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

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

// Same helper as feed
function getEmbedInfo(
  rawUrl: string | null
): { platform: Platform; embedUrl?: string; mediaUrl?: string } {
  if (!rawUrl) return { platform: "other" };
  const urlStr = rawUrl.trim();
  if (!urlStr) return { platform: "other" };

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { platform: "other", mediaUrl: urlStr };
  }

  const host = url.hostname.toLowerCase();

  // YouTube
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    let videoId: string | null = null;
    if (host.includes("youtu.be")) {
      videoId = url.pathname.replace("/", "");
    } else {
      videoId = url.searchParams.get("v");
    }

    if (videoId) {
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        mediaUrl: url.toString(),
      };
    }
    return { platform: "youtube", mediaUrl: url.toString() };
  }

  // SoundCloud
  if (host.includes("soundcloud.com")) {
    const embed = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      url.toString()
    )}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
    return {
      platform: "soundcloud",
      embedUrl: embed,
      mediaUrl: url.toString(),
    };
  }

  // Mixcloud
  if (host.includes("mixcloud.com")) {
    const embed = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&light=1&feed=${encodeURIComponent(
      url.toString()
    )}`;
    return {
      platform: "mixcloud",
      embedUrl: embed,
      mediaUrl: url.toString(),
    };
  }

  return { platform: "other", mediaUrl: url.toString() };
}

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>(initialClips);

  function handleAddClip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const handle = (formData.get("handle") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const mediaRaw = formData.get("mediaUrl") as string | null;

    if (!handle || !title || !mediaRaw) return;

    const { platform, embedUrl, mediaUrl } = getEmbedInfo(mediaRaw);

    const newClip: Clip = {
      id: Date.now(),
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      title,
      description,
      createdAt: new Date(),
      platform,
      mediaUrl,
      embedUrl,
    };

    setClips((prev) => [newClip, ...prev]);
    form.reset();
  }

  return (
    <div className="clips-page">
      {/* Header */}
      <div className="clips-header">
        <h1>Clips</h1>
        <p>Drop scratch sessions, routines, battle clips and mixes.</p>
      </div>

      {/* Add new clip */}
      <section className="clips-form">
        <form onSubmit={handleAddClip}>
          <div className="clips-form-row">
            <div className="clips-field">
              <label className="clips-label" htmlFor="handle">
                Handle
              </label>
              <input
                id="handle"
                name="handle"
                type="text"
                className="clips-input"
                placeholder="@yourdjname"
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
                type="text"
                className="clips-input"
                placeholder="Name this clip"
                required
              />
            </div>
          </div>

          <div className="clips-field" style={{ marginBottom: "0.75rem" }}>
            <label className="clips-label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              className="clips-textarea"
              placeholder="Scratch pattern, BPM, gear, battle context..."
            />
          </div>

          <div className="clips-field" style={{ marginBottom: "0.75rem" }}>
            <label className="clips-label" htmlFor="mediaUrl">
              Clip link (YouTube, SoundCloud, Mixcloud)
            </label>
            <input
              id="mediaUrl"
              name="mediaUrl"
              type="url"
              className="clips-input"
              placeholder="https://youtube.com/... or https://soundcloud.com/... or https://mixcloud.com/..."
              required
            />
          </div>

          <div className="clips-submit-row">
            <button type="submit" className="clips-submit">
              Add clip
            </button>
          </div>
        </form>
      </section>

      {/* Latest clips */}
      <section className="clips-list">
        {clips.map((clip) => (
          <article key={clip.id} className="clip-card">
            <div className="clip-card-header">
              <div>
                <div className="clip-title">{clip.title}</div>
                <div className="clip-meta">
                  {clip.handle} · {timeSince(clip.createdAt)}
                </div>
              </div>
            </div>

            {clip.description && (
              <div className="clip-description">{clip.description}</div>
            )}

            {clip.embedUrl && clip.platform !== "other" && (
              <div className="clips-embed">
                <iframe
                  className={`embed-frame ${clip.platform}`}
                  src={clip.embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen={clip.platform === "youtube"}
                  loading="lazy"
                  title={`clip-${clip.id}`}
                />
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

