"use client";

import { FormEvent, useState } from "react";

type Platform = "youtube" | "soundcloud" | "mixcloud" | "other";

type FeedPost = {
  id: number;
  handle: string;
  text: string;
  createdAt: Date;
  mood?: "practice" | "battle" | "clip" | "other";
  mediaUrl?: string;
  embedPlatform?: Platform;
  embedUrl?: string;
};

const initialPosts: FeedPost[] = [
  {
    id: 1,
    handle: "@scratchmonk",
    text: "Locked in a 2-hour session on the 1200s. Working on reverse flares + orbit combos.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    mood: "practice",
  },
  {
    id: 2,
    handle: "@beatjugglekid",
    text: "Who’s down for a friendly online beat juggle battle this weekend?",
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    mood: "battle",
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

// Detect platform + embed URL from a pasted link
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

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);

  function handlePost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const handle = (formData.get("handle") as string)?.trim();
    const text = (formData.get("text") as string)?.trim();
    const mood = formData.get("mood") as FeedPost["mood"];
    const mediaRaw = formData.get("mediaUrl") as string | null;

    if (!handle || !text) return;

    const { platform, embedUrl, mediaUrl } = getEmbedInfo(mediaRaw);

    const newPost: FeedPost = {
      id: Date.now(),
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      text,
      mood: mood || "other",
      createdAt: new Date(),
      mediaUrl,
      embedPlatform: platform,
      embedUrl,
    };

    setPosts((prev) => [newPost, ...prev]);
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
        <form onSubmit={handlePost}>
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
              <select id="mood" name="mood" className="feed-select">
                <option value="practice">Practice</option>
                <option value="battle">Battle</option>
                <option value="clip">New clip</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="feed-field" style={{ marginBottom: "0.75rem" }}>
            <label className="feed-label" htmlFor="text">
              Post
            </label>
            <textarea
              id="text"
              name="text"
              className="feed-textarea"
              placeholder="What are you working on today?"
              required
            />
          </div>

          <div className="feed-field" style={{ marginBottom: "0.75rem" }}>
            <label className="feed-label" htmlFor="mediaUrl">
              Media link (YouTube, SoundCloud, Mixcloud – optional)
            </label>
            <input
              id="mediaUrl"
              name="mediaUrl"
              type="url"
              className="feed-input"
              placeholder="https://youtube.com/... or https://soundcloud.com/... or https://mixcloud.com/..."
            />
          </div>

          <div className="feed-submit-row">
            <button type="submit" className="feed-submit">
              Drop post
            </button>
          </div>
        </form>
      </section>

      {/* Feed list */}
      <section>
        {posts.map((post) => {
          const initial =
            post.handle.replace("@", "").trim().charAt(0).toUpperCase() || "D";

          let moodLabel: string | undefined;
          let moodClass = "feed-mood";

          if (post.mood === "practice") {
            moodLabel = "Practice";
            moodClass += " practice";
          } else if (post.mood === "battle") {
            moodLabel = "Battle";
            moodClass += " battle";
          } else if (post.mood === "clip") {
            moodLabel = "New clip";
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
                  {moodLabel && <span className={moodClass}>{moodLabel}</span>}
                </div>

                <p>{post.text}</p>

                {/* Media embed if present */}
                {post.embedUrl && post.embedPlatform !== "other" && (
                  <div className="feed-embed">
                    <iframe
                      className={`embed-frame ${post.embedPlatform}`}
                      src={post.embedUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen={post.embedPlatform === "youtube"}
                      loading="lazy"
                      title={`media-${post.id}`}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
