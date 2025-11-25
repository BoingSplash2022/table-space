"use client";

import { useEffect, useRef, useState } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function VoiceChat({ threadId }: { threadId: string }) {
  const [connected, setConnected] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const lastSignalWrite = useRef(0);

  /* ----------------------------------------------------
     SETUP WEBRTC PEER CONNECTION
  ---------------------------------------------------- */
  async function startVoiceChat() {
    if (pcRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    /* ---- Local mic ---- */
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    if (localAudioRef.current) localAudioRef.current.srcObject = stream;

    /* ---- Remote audio ---- */
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
      }
    };

    /* ---- ICE candidates → Firestore ---- */
    pc.onicecandidate = async (ev) => {
      if (!ev.candidate) return;

      lastSignalWrite.current = Date.now();
      await setDoc(
        doc(db, "threads", threadId, "voice", "signal"),
        {
          ice: JSON.stringify(ev.candidate),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    };

    /* ---- SDP → Firestore ---- */
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    lastSignalWrite.current = Date.now();
    await setDoc(
      doc(db, "threads", threadId, "voice", "signal"),
      {
        sdp: JSON.stringify(offer),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setConnected(true);
  }

  /* ----------------------------------------------------
     LISTEN FOR REMOTE SIGNALS
  ---------------------------------------------------- */
  useEffect(() => {
    const ref = doc(db, "threads", threadId, "voice", "signal");

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const now = Date.now();

      /* Avoid reacting to our own recent writes */
      if (now - lastSignalWrite.current < 500) return;

      const pc = pcRef.current;
      if (!pc) return;

      /* ---- Remote SDP ---- */
      if (data.sdp) {
        const desc = JSON.parse(data.sdp);

        if (desc.type === "offer") {
          await pc.setRemoteDescription(desc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          lastSignalWrite.current = Date.now();
          await updateDoc(ref, {
            sdp: JSON.stringify(answer),
            updatedAt: serverTimestamp(),
          });
        } else if (desc.type === "answer") {
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(desc);
          }
        }
      }

      /* ---- Remote ICE ---- */
      if (data.ice) {
        try {
          await pc.addIceCandidate(JSON.parse(data.ice));
        } catch (e) {
          console.warn("ICE add error", e);
        }
      }
    });

    return () => unsub();
  }, [threadId]);

  /* ----------------------------------------------------
     END CALL
  ---------------------------------------------------- */
  async function endCall() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnected(false);
    setRemoteConnected(false);

    // Clear Firestore state
    await setDoc(
      doc(db, "threads", threadId, "voice", "signal"),
      { sdp: null, ice: null, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  return (
    <div className="p-3 bg-gray-100 rounded border mb-4">
      <h3 className="font-semibold mb-2">Voice Chat</h3>

      {!connected && (
        <button
          onClick={startVoiceChat}
          className="messages-compose-send"
        >
          Start Voice Chat
        </button>
      )}

      {connected && (
        <>
          <p className="text-sm text-gray-600 mb-2">
            {remoteConnected ? "Connected" : "Waiting for others to join…"}
          </p>

          <button
            onClick={endCall}
            className="messages-compose-send bg-red-600 text-white"
          >
            End Call
          </button>
        </>
      )}

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}
