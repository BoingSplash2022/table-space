"use client";

import { FormEvent, useState } from "react";

type Platform = "youtube" | "soundcloud" | "mixcloud" | "other";

type Battle = {
  id: number;
  title: string;
  challenger: string;
  opponent: string;
  conditions?: string;
  createdAt: Date;
  // Challenger media
  challengerPlatform?: Platform;
  challengerMediaUrl?: string;
  challengerEmbedUrl?: string;
  // Opponent media
  opponentPlatform?: Platform;
  opponentMediaUrl?: string;
  opponentEmbedUrl?: string;
  // Votes
  challengerVotes: number;
  opponentVotes: number;
};

const initialBattles: Battle[] = [
  {
    id: 1,
    title: "90s Boom Bap Scratch-Off",
    challenger: "@scratchmonk",
    opponent: "@beatjugglekid",
    conditions: "2 x 45-second rounds. 95–100 BPM, 90s hip-hop only.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    challengerPlatform: "youtube",
    challengerMediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    challengerEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    opponentPlatform: "youtube",
    opponentMediaUrl: "https://www.youtube.com/watch?v=oHg5SJYRHA0",
    opponentEmbedUrl: "https://www.youtube.com/embed/oHg5SJYRHA0",
    challengerVotes: 5,
    opponentVotes: 3,
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

// Helper: detect platform and build embed URL from a pasted link
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

export default function BattlesPage() {
  const [battles, setBattles] = useState<Battle[]>(initialBattles);

  function handleCreateBattle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const challenger = (formData.get("challenger") as string)?.trim();
    const opponent = (formData.get("opponent") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const conditions = (formData.get("conditions") as string)?.trim();
    const challengerMediaRaw = formData.get("challengerMedia") as string | null;
    const opponentMediaRaw = formData.get("opponentMedia") as string | null;

    if (!challenger || !opponent || !title) return;

    const challengerInfo = getEmbedInfo(challengerMediaRaw);
    const opponentInfo = getEmbedInfo(opponentMediaRaw);

    const newBattle: Battle = {
      id: Date.now(),
      title,
      challenger: challenger.startsWith("@") ? challenger : `@${challenger}`,
      opponent: opponent.startsWith("@") ? opponent : `@${opponent}`,
      conditions,
      createdAt: new Date(),
      challengerPlatform: challengerInfo.platform,
      challengerMediaUrl: challengerInfo.mediaUrl,
      challengerEmbedUrl: challengerInfo.embedUrl,
      opponentPlatform: opponentInfo.platform,
      opponentMediaUrl: opponentInfo.mediaUrl,
      opponentEmbedUrl: opponentInfo.embedUrl,
      challengerVotes: 0,
      opponentVotes: 0,
    };

    setBattles((prev) => [newBattle, ...prev]);
    form.reset();
  }

  function handleVote(id: number, side: "challenger" | "opponent") {
    setBattles((prev) =>
      prev.map((battle) => {
        if (battle.id !== id) return battle;
        if (side === "challenger") {
          return { ...battle, challengerVotes: battle.challengerVotes + 1 };
        }
        return { ...battle, opponentVotes: battle.opponentVotes + 1 };
      })
    );
  }

  return (
    // Re-use the same container + styles as Feed
    <div className="feed">
      {/* Header */}
      <div className="feed-header">
        <h1>Battles</h1>
        <p>
          Spin up head-to-head scratch or beat-juggle battles, drop clips, and
          let the community vote.
        </p>
      </div>

      {/* Create battle form */}
      <section className="feed-form">
        <form onSubmit={handleCreateBattle}>
          <div className="feed-form-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="challenger">
                Your handle
              </label>
              <input
                id="challenger"
                name="challenger"
                type="text"
                className="feed-input"
                placeholder="@yourdjname"
                required
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="opponent">
                Opponent handle
              </label>
              <input
                id="opponent"
                name="opponent"
                type="text"
                className="feed-input"
                placeholder="@otherdj"
                required
              />
            </div>
          </div>

          <div className="feed-field" style={{ marginBottom: "0.75rem" }}>
            <label className="feed-label" htmlFor="title">
              Battle title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className="feed-input"
              placeholder="e.g. 2-minute juggle battle, 90–100 BPM"
              required
            />
          </div>

          <div className="feed-field" style={{ marginBottom: "0.75rem" }}>
            <label className="feed-label" htmlFor="conditions">
              Conditions / rules
            </label>
            <textarea
              id="conditions"
              name="conditions"
              className="feed-textarea"
              placeholder="Time limit, BPM, genre, gear, judging rules..."
            />
          </div>

          <div className="feed-form-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="challengerMedia">
                Your clip (YouTube / SoundCloud / Mixcloud)
              </label>
              <input
                id="challengerMedia"
                name="challengerMedia"
                type="url"
                className="feed-input"
                placeholder="https://youtube.com/... or soundcloud/mixcloud..."
              />
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="opponentMedia">
                Opponent clip (YouTube / SoundCloud / Mixcloud)
              </label>
              <input
                id="opponentMedia"
                name="opponentMedia"
                type="url"
                className="feed-input"
                placeholder="https://youtube.com/... or soundcloud/mixcloud..."
              />
            </div>
          </div>

          <div className="feed-submit-row">
            <button type="submit" className="feed-submit">
              Create battle
            </button>
          </div>
        </form>
      </section>

      {/* Battle list */}
      <section>
        {battles.map((battle) => (
          <article key={battle.id} className="feed-post">
            <div className="feed-avatar">VS</div>

            <div className="feed-post-body">
              <div className="feed-post-header">
                <span className="feed-handle">{battle.title}</span>
                <span className="feed-time">
                  {timeSince(battle.createdAt)}
                </span>
                <span className="feed-mood battle">Battle</span>
              </div>

              <p style={{ marginBottom: "0.25rem" }}>
                <strong>{battle.challenger}</strong> vs{" "}
                <strong>{battle.opponent}</strong>
              </p>

              {battle.conditions && <p>{battle.conditions}</p>}

              <div className="battle-videos">
                {/* Challenger side */}
                <div className="battle-side">
                  <div className="battle-side-header">
                    <span>{battle.challenger}</span>
                    <span className="clip-meta">
                      {battle.challengerVotes} vote
                      {battle.challengerVotes === 1 ? "" : "s"}
                    </span>
                  </div>

                  {battle.challengerEmbedUrl &&
                    battle.challengerPlatform !== "other" && (
                      <div className="clips-embed">
                        <iframe
                          className={`embed-frame ${battle.challengerPlatform}`}
                          src={battle.challengerEmbedUrl}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen={
                            battle.challengerPlatform === "youtube"
                          }
                          loading="lazy"
                          title={`battle-${battle.id}-challenger`}
                        />
                      </div>
                    )}

                  <button
                    type="button"
                    className="battle-vote-btn"
                    onClick={() => handleVote(battle.id, "challenger")}
                  >
                    Vote {battle.challenger}
                  </button>
                </div>

                {/* Opponent side */}
                <div className="battle-side">
                  <div className="battle-side-header">
                    <span>{battle.opponent}</span>
                    <span className="clip-meta">
                      {battle.opponentVotes} vote
                      {battle.opponentVotes === 1 ? "" : "s"}
                    </span>
                  </div>

                  {battle.opponentEmbedUrl &&
                    battle.opponentPlatform !== "other" && (
                      <div className="clips-embed">
                        <iframe
                          className={`embed-frame ${battle.opponentPlatform}`}
                          src={battle.opponentEmbedUrl}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen={
                            battle.opponentPlatform === "youtube"
                          }
                          loading="lazy"
                          title={`battle-${battle.id}-opponent`}
                        />
                      </div>
                    )}

                  <button
                    type="button"
                    className="battle-vote-btn"
                    onClick={() => handleVote(battle.id, "opponent")}
                  >
                    Vote {battle.opponent}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
