"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";

type ListingState = {
  handle: string;
  itemTitle: string;
  format: string; // Vinyl / Digital / Merch / Other
  condition: string;
  priceCurrency: string; // £ / $ / €
  priceValue: string;
  link: string;
  description: string;
};

type ListingDocFromDb = ListingState & {
  uid: string;
  createdAt?: Timestamp;
};

type ListingDoc = ListingState & {
  id: string;
  uid: string;
  createdAt: Date | null;
};

const emptyListing: ListingState = {
  handle: "",
  itemTitle: "",
  format: "Vinyl",
  condition: "VG+",
  priceCurrency: "£",
  priceValue: "",
  link: "",
  description: "",
};

// ---------- helper for icons ----------
function iconForFormat(format: string) {
  const f = format.toLowerCase();
  if (f === "vinyl") return "/icons/vinyl.svg";
  if (f === "digital") return "/icons/digital.svg";
  if (f === "merch" || f === "merchandise") return "/icons/merch.svg";
  return "/icons/other.svg";
}

export default function BuySellPage() {
  const { user, activeProfile } = useAuthContext();

  const [form, setForm] = useState<ListingState>(emptyListing);
  const [listings, setListings] = useState<ListingDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When activeProfile changes, prefill handle
  useEffect(() => {
    if (activeProfile) {
      setForm((prev) => ({
        ...prev,
        handle: activeProfile.handle || prev.handle,
      }));
    }
  }, [activeProfile]);

  // Load listings
  useEffect(() => {
    const ref = collection(db, "buySellListings");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ListingDoc[] = snap.docs.map((d) => {
          const data = d.data() as ListingDocFromDb;
          return {
            id: d.id,
            uid: data.uid,
            handle: data.handle ?? "",
            itemTitle: data.itemTitle ?? "",
            format: data.format ?? "",
            condition: data.condition ?? "",
            priceCurrency: data.priceCurrency ?? "£",
            priceValue: data.priceValue ?? "",
            link: data.link ?? "",
            description: data.description ?? "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          };
        });
        setListings(rows);
      },
      (err) => {
        console.error("Error loading buy/sell listings", err);
      }
    );

    return () => unsub();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!user || !activeProfile) {
      setErrorMessage("Please sign in and create a profile before posting.");
      return;
    }

    if (!form.itemTitle.trim() || !form.link.trim()) {
      setErrorMessage("Please add an item title and a product link.");
      return;
    }

    try {
      setSubmitting(true);

      const ref = collection(db, "buySellListings");
      await addDoc(ref, {
        ...form,
        handle:
          form.handle && form.handle.trim().length > 0
            ? form.handle
            : activeProfile.handle,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });

      setForm((prev) => ({
        ...emptyListing,
        handle: activeProfile.handle,
        format: prev.format,
        condition: prev.condition,
        priceCurrency: prev.priceCurrency,
      }));
    } catch (err) {
      console.error("Error posting listing", err);
      setErrorMessage("Could not post listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canPost = Boolean(user && activeProfile);

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Buy / Sell</h1>
        <p>
          List scratch records, battle tools, mixers and merch. Paste links to
          Bandcamp, your web shop, Discogs, etc.
        </p>
      </div>

      {/* FORM */}
      <section className="feed-form">
        {!canPost && (
          <p className="auth-error" style={{ marginBottom: "0.75rem" }}>
            Please sign in and create a profile before posting a listing.
          </p>
        )}

        <form onSubmit={handleSubmit}>
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
              value={form.handle}
              onChange={handleChange}
            />
          </div>

          <div className="feed-field">
            <label className="feed-label" htmlFor="itemTitle">
              Item title
            </label>
            <input
              id="itemTitle"
              name="itemTitle"
              type="text"
              className="feed-input"
              placeholder='Scratch 12" / battle tool / mixer / etc.'
              value={form.itemTitle}
              onChange={handleChange}
            />
          </div>

          {/* format / condition / price */}
          <div className="feed-field-row">
            <div className="feed-field">
              <label className="feed-label" htmlFor="format">
                Format
              </label>
              <select
                id="format"
                name="format"
                className="feed-input"
                value={form.format}
                onChange={handleChange}
              >
                <option value="Vinyl">Vinyl</option>
                <option value="Digital">Digital</option>
                <option value="Merch">Merch</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="condition">
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                className="feed-input"
                value={form.condition}
                onChange={handleChange}
              >
                <option value="Mint">Mint</option>
                <option value="NM">NM</option>
                <option value="VG+">VG+</option>
                <option value="VG">VG</option>
                <option value="G">G</option>
              </select>
            </div>

            <div className="feed-field" style={{ maxWidth: 220 }}>
              <label className="feed-label">Price</label>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <select
                  name="priceCurrency"
                  className="feed-input"
                  style={{ maxWidth: 70 }}
                  value={form.priceCurrency}
                  onChange={handleChange}
                >
                  <option value="£">£</option>
                  <option value="$">$</option>
                  <option value="€">€</option>
                </select>
                <input
                  name="priceValue"
                  type="number"
                  step="0.01"
                  min="0"
                  className="feed-input"
                  value={form.priceValue}
                  onChange={handleChange}
                  placeholder="25.00"
                />
              </div>
            </div>
          </div>

          <div className="feed-field">
            <label className="feed-label" htmlFor="link">
              Store / Bandcamp / product link
            </label>
            <input
              id="link"
              name="link"
              type="url"
              className="feed-input"
              placeholder="https://your-shop.com/product/..."
              value={form.link}
              onChange={handleChange}
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
              placeholder="Pressing info, tracklist, shipping details, etc."
              value={form.description}
              onChange={handleChange}
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
              disabled={!canPost || submitting}
            >
              {submitting ? "Posting…" : "Post listing"}
            </button>
          </div>
        </form>
      </section>

      {/* LISTINGS */}
      <section style={{ marginTop: "1.5rem" }}>
        {listings.map((listing) => {
          const dateLabel = listing.createdAt
            ? listing.createdAt.toLocaleDateString("en-GB")
            : "";

          const iconSrc = iconForFormat(listing.format);

          return (
            <article
              key={listing.id}
              className="feed-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 600,
                      marginBottom: "0.15rem",
                    }}
                  >
                    {listing.itemTitle}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.75,
                    }}
                  >
                    <span>{listing.handle}</span>
                    {" · "}
                    <span>{listing.format}</span>
                    {" · "}
                    <span>{listing.condition}</span>
                    {" · "}
                    {listing.priceCurrency}
                    {listing.priceValue}
                    {dateLabel ? ` · ${dateLabel}` : ""}
                  </div>
                </div>

                {/* format icon on the right */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconSrc}
                  alt={listing.format}
                  width={26}
                  height={26}
                  style={{ opacity: 0.9 }}
                />
              </div>

              {listing.description && (
                <p
                  style={{
                    fontSize: "0.9rem",
                  }}
                >
                  {listing.description}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                {listing.link && (
                  <a
                    href={listing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="buy-link"
                    style={{ fontWeight: 600 }}
                  >
                    View listing
                  </a>
                )}

                <Link
                  href={{
                    pathname: "/messages",
                    query: {
                      seller: listing.handle,
                      listingTitle: listing.itemTitle,
                    },
                  }}
                  className="messages-compose-send"
                >
                  Message seller
                </Link>
              </div>
            </article>
          );
        })}

        {listings.length === 0 && (
          <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
            No listings yet. Be the first to post something for sale.
          </p>
        )}
      </section>
    </div>
  );
}




