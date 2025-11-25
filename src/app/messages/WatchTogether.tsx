"use client";

import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Shared YouTube sync engine for group chats + DMs
 * Stored at: threads/{threadId}/watchState/state
 */
export default function WatchTogether({ threadId }: { threadId: string }) {
  const [state, setState] = useState<any>(null);
  const playerRef = useRef<any>(null);

  // prevent update loops
  const isLocalUpdate = useRef(false);
  const lastSeek = useRef(0);

  /* ---------------------------------------------------------
     1. Subscribe to Firestore state
  --------------------------------------------------------- */
  useEffect(() => {
    const ref = doc(db, "threads", threadId, "watchState", "state");

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        // Create default state
        await setDoc(ref, {
          videoId: null,
          isPlaying: false,
          position: 0,
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const data = snap.data();
      setState(data);

      // Ignore updates WE just sent
      if (isLocalUpdate.current) {
        isLocalUpdate.current = false;
        return;
      }

      const player = playerRef.current;
      if (!player || !data.videoId) return;

      const remotePos = data.position;
      const localPos = player.getCurrentTime();

      // Only seek if > 0.7s out of sync (prevents jitter)
      if (Math.abs(remotePos - localPos) > 0.7) {
        lastSeek.current = Date.now();
        player.seekTo(remotePos, true);
      }

      if (data.isPlaying) {
        if (player.getPlayerState() !== 1) player.playVideo();
      } else {
        if (player.getPlayerState() !== 2) player.pauseVideo();
      }
    });

    return () => unsub();
  }, [threadId]);

  /* ---------------------------------------------------------
     2. Push updates to Firestore
  --------------------------------------------------------- */
  const updateRemoteState = async (fields: any) => {
    const ref = doc(db, "threads", threadId, "watchState", "state");
    isLocalUpdate.current = true;

    try {
      await updateDoc(ref, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("WatchTogether update failed:", err);
    }
  };

  /* ---------------------------------------------------------
     3. Player Ready
  --------------------------------------------------------- */
  const handlePlayerReady = (e: any) => {
    playerRef.current = e.target;
  };

  /* ---------------------------------------------------------
     4. Player State Changes (local → remote)
  --------------------------------------------------------- */
  const handleStateChange = (event: any) => {
    const player = event.target;
    if (!state) return;

    // throttle updates after forced seeks
    if (Date.now() - lastSeek.current < 400) return;

    const yt = event.data;
    const position = player.getCurrentTime();

    if (yt === 1) {
      updateRemoteState({ isPlaying: true, position });
    } else if (yt === 2) {
      updateRemoteState({ isPlaying: false, position });
    }
  };

  /* ---------------------------------------------------------
     5. Smarter Video ID Extraction
  --------------------------------------------------------- */
  function extractVideoId(url: string): string | null {
    try {
      const u = new URL(url);

      if (u.hostname.includes("youtu.be")) return u.pathname.substring(1);
      if (u.searchParams.get("v")) return u.searchParams.get("v");

      if (u.pathname.includes("/shorts/")) {
        return u.pathname.split("/shorts/")[1].split("?")[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  function loadVideo(url: string) {
    const id = extractVideoId(url);
    if (!id) return alert("Invalid YouTube URL");

    updateRemoteState({ videoId: id, position: 0, isPlaying: false });
  }

  /* ---------------------------------------------------------
     6. UI
  --------------------------------------------------------- */
  return (
    <div className="watch-container p-3 bg-white border rounded-lg shadow-sm">
      <h3 className="font-semibold mb-3">🎬 Watch Together</h3>

      {/* URL Input */}
      <input
        className="feed-input mb-3 w-full"
        placeholder="Paste YouTube link and press Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = (e.target as HTMLInputElement).value.trim();
            if (value) loadVideo(value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />

      {/* Player */}
      {state?.videoId ? (
        <YouTube
          videoId={state.videoId}
          onReady={handlePlayerReady}
          onStateChange={handleStateChange}
          opts={{
            width: "100%",
            playerVars: {
              modestbranding: 1,
              controls: 1,
              rel: 0,
            },
          }}
        />
      ) : (
        <p className="text-sm text-gray-500">No video loaded yet.</p>
      )}
    </div>
  );
}
