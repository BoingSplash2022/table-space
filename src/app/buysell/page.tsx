"use client";

import {
  FormEvent,
  useEffect,
  useState,
  ChangeEvent,
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";

type Format = "vinyl" | "digital" | "merch" | "other";

type BuySellListingFromDb = {
  handle?: string;
  itemTitle?: string;
  format?: Format;
  condition?: string;
  priceCurrency?: string;
  priceAmount?: number;
  storeUrl?: string;
  description?: string;
  createdAt?: Timestamp;
  uid?: string;
  imageUrl?: string | null;
};

type BuySellListing = {
  id: string;
  handle: string;
  itemTitle: string;
  format: Format;
  condition: string;
  priceCurrency: string;
  priceAmount: number;
  storeUrl: string;
  description: string;
  createdAt: Date | null;
  imageUrl?: string;
};

// icon helper – assumes you’ve put SVGs into /public/icons/
function getFormatIconSrc(format: Format): string {
  switch (format) {
    case "vinyl":
      return "/icons/vinyl.svg";
    case "digital":
      return "/icons/digital.svg";
    case "merch":
      return "/icons/merch.svg";
    case "other":
    default:
      return "/icons/other.svg";
  }
}

export default function BuySellPage() {
  const { user, activeProfile } = useAuthContext();

  const [listings, setListings] = useState<BuySellListing[]>([]);
  const [showForm, setShowForm] = useState(false);

  // image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canPost = Boolean(user && activeProfile);

  // Load listings
  useEffect(() => {
    const refCol = collection(db, "buySellListings");
    const q = query(refCol, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows: BuySellListing[] = snap.docs.map((d) => {
        const data = d.data() as BuySellListingFromDb;
        return {
          id: d.id,
          handle: data.handle ?? "@yourdjname",
          itemTitle: data.itemTitle ?? "",
          format: data.format ?? "vinyl",
          condition: data.condition ?? "",
          priceCurrency: data.priceCurrency ?? "£",
          priceAmount: data.priceAmount ?? 0,
          storeUrl: data.storeUrl ?? "",
          description: data.description ?? "",
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          imageUrl: data.imageUrl ?? undefined,
        };
      });
      setListings(rows);
    });

    return () => unsub();
  }, []);

  // image input change
  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      const localUrl = URL.createObjectURL(file);
      setImagePreview(localUrl);
    } else {
      setImagePreview(null);
    }
  }

  async function handlePostListing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!user || !activeProfile) {
      setErrorMessage("Please sign in and choose a profile to post a listing.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const handle = (formData.get("handle") as string)?.trim();
    const itemTitle = (formData.get("itemTitle") as string)?.trim();
    const format = (formData.get("format") as Format) || "vinyl";
    const condition = (formData.get("condition") as string) || "VG+";
    const priceCurrency = (formData.get("priceCurrency") as string) || "£";
    const priceAmountRaw = (formData.get("priceAmount") as string) || "0";
    const storeUrl = (formData.get("storeUrl") as string)?.trim() || "";
    const description = (formData.get("description") as string)?.trim() || "";

    const priceAmount = Number(priceAmountRaw);

    if (!handle || !itemTitle) {
      setErrorMessage("Handle and item title are required.");
      return;
    }

    setSubmitting(true);

    try {
      // 1) upload image if provided
      let imageUrl: string | null = null;

      if (imageFile) {
        const path = `listingImages/${user.uid}/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // 2) create Firestore doc
      await addDoc(collection(db, "buySellListings"), {
        handle: handle.startsWith("@") ? handle : `@${handle}`,
        itemTitle,
        format,
        condition,
        priceCurrency,
        priceAmount,
        storeUrl,
        description,
        createdAt: serverTimestamp(),
        uid: user.uid,
        imageUrl: imageUrl || null,
      });

      form.reset();
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error posting listing", err);
      setErrorMessage("Could not post listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Buy / Sell</h1>
        <p>
          List scratch records, battle tools, mixers and more. Paste links to
          Bandcamp, your web shop, Discogs, etc.
        </p>
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
          {showForm ? "Cancel listing ⌃" : "Post listing ⌄"}
        </button>
      </div>

      {/* Composer (collapsible) */}
      {showForm && (
        <section className="feed-form">
          {!canPost && (
            <p className="auth-subnote" style={{ marginBottom: "0.75rem" }}>
              Please sign in and select a profile to post a listing.
            </p>
          )}

          <form onSubmit={handlePostListing}>
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
                  defaultValue={activeProfile?.handle ?? ""}
                  placeholder="@yourdjname"
                  disabled={!canPost}
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
                  disabled={!canPost}
                />
              </div>
            </div>

            <div className="feed-form-row">
              <div className="feed-field">
                <label className="feed-label" htmlFor="format">
                  Format
                </label>
                <select
                  id="format"
                  name="format"
                  className="feed-select"
                  defaultValue="vinyl"
                  disabled={!canPost}
                >
                  <option value="vinyl">Vinyl</option>
                  <option value="digital">Digital</option>
                  <option value="merch">Merch</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="condition">
                  Condition
                </label>
                <select
                  id="condition"
                  name="condition"
                  className="feed-select"
                  defaultValue="VG+"
                  disabled={!canPost}
                >
                  <option value="NM">NM</option>
                  <option value="VG+">VG+</option>
                  <option value="VG">VG</option>
                  <option value="G">G</option>
                  <option value="Used">Used</option>
                  <option value="New">New</option>
                </select>
              </div>

              <div className="feed-field" style={{ maxWidth: 220 }}>
                <label className="feed-label">Price</label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <select
                    name="priceCurrency"
                    className="feed-select"
                    defaultValue="£"
                    disabled={!canPost}
                  >
                    <option value="£">£</option>
                    <option value="$">$</option>
                    <option value="€">€</option>
                  </select>
                  <input
                    name="priceAmount"
                    type="number"
                    min="0"
                    step="0.5"
                    className="feed-input"
                    placeholder="25.00"
                    disabled={!canPost}
                  />
                </div>
              </div>
            </div>

            <div className="feed-field">
              <label className="feed-label" htmlFor="storeUrl">
                Store / Bandcamp / product link
              </label>
              <input
                id="storeUrl"
                name="storeUrl"
                type="url"
                className="feed-input"
                placeholder="https://your-shop.com/product/..."
                disabled={!canPost}
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
                disabled={!canPost}
              />
            </div>

            {/* OPTIONAL IMAGE UPLOAD */}
            <div className="feed-field">
              <label className="feed-label" htmlFor="listingImage">
                Listing image (optional)
              </label>
              <input
                id="listingImage"
                name="listingImage"
                type="file"
                accept="image/*"
                className="feed-input"
                onChange={handleImageChange}
                disabled={!canPost}
              />
              {imagePreview && (
                <div style={{ marginTop: "0.5rem" }}>
                  <img
                    src={imagePreview}
                    alt="Listing preview"
                    style={{
                      maxWidth: "160px",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                </div>
              )}
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
      )}

      {/* LISTINGS */}
      <section className="clips-list">
        {listings.map((listing) => {
          const iconSrc = getFormatIconSrc(listing.format);
          const created =
            listing.createdAt?.toLocaleDateString() ?? "";

          return (
            <article key={listing.id} className="clip-card">
              <div className="clip-card-inner">
                {/* optional image */}
                {listing.imageUrl && (
                  <div
                    style={{
                      marginRight: "1rem",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={listing.imageUrl}
                      alt={listing.itemTitle}
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                )}

                <div className="clip-card-main">
                  <div className="clip-card-header">
                    <div className="clip-title">{listing.itemTitle}</div>
                    <div className="clip-meta">
                      <img
                        src={iconSrc}
                        alt={listing.format}
                        style={{
                          width: 18,
                          height: 18,
                          marginRight: 6,
                        }}
                      />
                      <span style={{ marginRight: 12 }}>
                        {listing.handle}
                      </span>
                      <span>
                        {listing.condition} · {listing.priceCurrency}
                        {listing.priceAmount.toFixed(2)} · {created}
                      </span>
                    </div>
                  </div>

                  {listing.description && (
                    <p className="clip-description">
                      {listing.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "0.35rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {listing.storeUrl && (
                      <a
                        href={listing.storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="buy-link"
                      >
                        View listing
                      </a>
                    )}

                    {/* Message seller goes to /messages?seller=<handle>&listingTitle=<itemTitle> */}
                    <a
                      href={`/messages?seller=${encodeURIComponent(
                        listing.handle
                      )}&listingTitle=${encodeURIComponent(
                        listing.itemTitle
                      )}`}
                      className="battle-vote-btn"
                    >
                      Message seller
                    </a>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {listings.length === 0 && (
          <p className="messages-empty" style={{ marginTop: "0.75rem" }}>
            No listings yet. Be the first to post something.
          </p>
        )}
      </section>
    </div>
  );
}




