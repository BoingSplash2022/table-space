"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/profile";
    } catch (err: unknown) {
      let message = "Failed to sign in.";
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError(null);

    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = "/profile";
    } catch (err: unknown) {
      let message = "Google sign-in failed.";
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Sign in</h1>
        <p>Welcome back to TableSpace. Check battles, clips, and new scratch sessions.</p>
      </div>

      <section className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="feed-field">
            <label htmlFor="email" className="feed-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="feed-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="feed-field">
            <label htmlFor="password" className="feed-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="feed-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="feed-submit-row">
            <button
              type="submit"
              className="feed-submit w-full"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="auth-google-btn"
          disabled={submitting}
        >
          <span>Sign in with Google</span>
        </button>

        <p className="auth-subnote" style={{ marginTop: "0.75rem" }}>
          New here?{" "}
          <Link href="/register" className="auth-link">
            Create an account
          </Link>
        </p>
      </section>
    </div>
  );
}


