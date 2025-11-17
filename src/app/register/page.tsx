"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";



export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "/profile";
    } catch (err: unknown) {
      let message = "Failed to create account.";
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
      // This will create the user if they don't exist, or sign them in if they do.
      await signInWithPopup(auth, googleProvider);
      window.location.href = "/profile";
    } catch (err: unknown) {
      let message = "Google sign-up failed.";
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Create account</h1>
        <p>Claim your handle and join the TableSpace community.</p>
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

          <div className="feed-field">
            <label htmlFor="confirm" className="feed-label">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              className="feed-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              {submitting ? "Creating account…" : "Sign up"}
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
          <span>Sign up with Google</span>
        </button>

        <p className="auth-subnote" style={{ marginTop: "0.75rem" }}>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}

