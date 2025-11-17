"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";

type Listing = {
  id: string;
  uid: string;
  handle: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  format: string;
  condition: string;
  link: string;
  createdAt: Date | null;
};

const FORMATS = ["Vinyl", "Digital", "Merch", "Other"];
const CONDITIONS = ["New", "Mint", "VG+", "VG", "Good", "Used", "Other"];

export default function BuySellPage() {
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("£");
  const [format, setFormat] = useState("Vinyl");
  const [condition, setCondition] = useState("VG+");
  const [link, setLink] = useState("");

  // --- Load listings in real time from Firestore ---
  useEffect(() => {
    const listingsRef = collection(db, "buySellListings");
    const q = query(listingsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: Listing[] = snapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            uid: (data.uid as string) ?? "",
            handle: (data.handle as string) ?? "",
            title: (data.title as string) ?? "",
            description: (data.description as string) ?? "",
            price: (data.price as string) ?? "",
            currency: (data.currency as string) ?? "",
            format: (data.format as string) ?? "",
            condition: (data.condition as string) ?? "",
            link: (data.link as string) ?? "",
            createdAt: data.createdAt?.toDate
              ? (data.createdAt.toDate() as Date)
              : null,
          };
        });

        setListings(next);
      },
      (err) => {
        console.error("Error loading listings:", err);
        setError("Could not load listings from the server.");
      }
    );

    return () => unsubscribe();
  }, []);

  // --- Submit listing to Firestore ---
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      setError("You need to be signed in to post a listing.");
      return;
    }

    if (!handle.trim() || !title.trim() || !link.trim()) {
      setError("Handle, title, and link are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const listingsRef = collection(db, "buySellListings");

      await addDoc(listingsRef, {
        uid: user.uid,
        handle: handle.trim().startsWith("@")
          ? handle.trim()
          : `@${handle.trim()}`,
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        currency: currency.trim(),
        format,
        condition,
        link: link.trim(),
        createdAt: serverTimestamp(),
      });

      // Clear a subset of fields after successful submit
      setTitle("");
      setDescription("");
      setPrice("");
      setLink("");
    } catch (err) {
      console.error("Error adding listing:", err);
      setError("Could not save your listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Message seller button ---
  function messageSeller(listing: Listing) {
    const params = new URLSearchParams({
      seller: listing.handle,
      listingTitle: listing.title,
    });

    router.push(`/messages?${params.toString()}`);
  }

  return (
    <div className="main-shell">
      {/* Header */}
      <header className="clips-header">
        <h1>Buy / Sell</h1>
        <p>
          List scratch records, battle tools, mixers and more. Paste links to
          Bandcamp, your web shop, Discogs, etc.
        </p>
      </header>

      {/* Composer card */}
      <section className="clips-form">
        <form onSubmit={handleSubmit}>
          <div className="clips-form-row">
            <div className="clips-field">
              <label className="clips-label" htmlFor="handle">
                Handle
              </label>
              <input
                id="handle"
                className="clips-input"
                placeholder="@yourdjname"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>

            <div className="clips-field">
              <label className="clips-label" htmlFor="title">
                Item title
              </label>
              <input
                id="title"
                className="clips-input"
                placeholder='Scratch 12" / battle tool / mixer / etc.'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="clips-form-row">
            <div className="clips-field">
              <label className="clips-label" htmlFor="format">
                Format
              </label>
              <select
                id="format"
                className="clips-input"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMATS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="clips-field">
              <label className="clips-label" htmlFor="condition">
                Condition
              </label>
              <select
                id="condition"
                className="clips-input"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="clips-field">
              <label className="clips-label" htmlFor="price">
                Price
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <select
                  className="clips-input"
                  style={{ maxWidth: "4.5rem" }}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="£">£</option>
                  <option value="$">$</option>
                  <option value="€">€</option>
                </select>
                <input
                  id="price"
                  className="clips-input"
                  placeholder="25.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="clips-field">
            <label className="clips-label" htmlFor="link">
              Store / Bandcamp / product link
            </label>
            <input
              id="link"
              className="clips-input"
              placeholder="https://your-shop.com/product/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="clips-field" style={{ marginTop: "0.75rem" }}>
            <label className="clips-label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              className="clips-textarea"
              placeholder="Pressing info, tracklist, shipping details, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="auth-error" style={{ marginTop: "0.75rem" }}>
              {error}
            </p>
          )}

          <div className="clips-submit-row" style={{ marginTop: "0.75rem" }}>
            <button
              type="submit"
              className="clips-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting…" : "Post listing"}
            </button>
          </div>
        </form>
      </section>

      {/* Listings list */}
      <section className="clips-list">
        {listings.map((listing) => (
          <article key={listing.id} className="clip-card">
            <div className="clip-card-header">
              <div>
                <div className="clip-title">{listing.title}</div>
                <div className="clip-meta">
                  {listing.handle}{" "}
                  {listing.format && `• ${listing.format}`}
                  {listing.condition && ` • ${listing.condition}`}
                  {listing.price &&
                    ` • ${listing.currency || ""}${listing.price}`}
                  {listing.createdAt &&
                    ` • ${listing.createdAt.toLocaleDateString()}`}
                </div>
              </div>
            </div>

            {listing.description && (
              <p className="clip-description">{listing.description}</p>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {listing.link && (
                <a
                  href={listing.link}
                  target="_blank"
                  rel="noreferrer"
                  className="auth-link"
                >
                  View listing
                </a>
              )}

              <button
                type="button"
                className="battle-vote-btn"
                onClick={() => messageSeller(listing)}
              >
                Message seller
              </button>
            </div>
          </article>
        ))}

        {listings.length === 0 && (
          <p className="auth-subnote">
            No listings yet. Drop your first scratch record or battle tool.
          </p>
        )}
      </section>
    </div>
  );
}



