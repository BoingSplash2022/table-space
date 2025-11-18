"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";

type ProfileState = {
  displayName: string;
  handle: string;
  location: string;
  bio: string;
  styles: string;
  website: string;
  instagram: string;
  soundcloud: string;
  mixcloud: string;
  youtube: string;
  avatarUrl?: string;
};

type ProfileDocFromDb = ProfileState & {
  uid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type ProfileDoc = ProfileState & {
  id: string;
  uid: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const emptyProfile: ProfileState = {
  displayName: "",
  handle: "",
  location: "",
  bio: "",
  styles: "",
  website: "",
  instagram: "",
  soundcloud: "",
  mixcloud: "",
  youtube: "",
  avatarUrl: "",
};

const defaultProfile: ProfileState = {
  displayName: "",
  handle: "",
  location: "",
  bio: "",
  styles: "",
  website: "",
  instagram: "",
  soundcloud: "",
  mixcloud: "",
  youtube: "",
  avatarUrl: "",
};

export default function ProfilePage() {
  const { user, setActiveProfile } = useAuthContext();

  const [profiles, setProfiles] = useState<ProfileDoc[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileState>(defaultProfile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all profiles for the current user
  useEffect(() => {
    if (!user) {
      setErrorMessage("Please sign in to edit your profile.");
      setProfiles([]);
      setActiveProfileId(null);
      setAvatarPreview(null);
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    const profilesRef = collection(db, "profiles");
    const q = query(
      profilesRef,
      where("uid", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ProfileDoc[] = snapshot.docs.map((d) => {
          const data = d.data() as ProfileDocFromDb;
          return {
            id: d.id,
            uid: data.uid,
            displayName: data.displayName ?? "",
            handle: data.handle ?? "",
            location: data.location ?? "",
            bio: data.bio ?? "",
            styles: data.styles ?? "",
            website: data.website ?? "",
            instagram: data.instagram ?? "",
            soundcloud: data.soundcloud ?? "",
            mixcloud: data.mixcloud ?? "",
            youtube: data.youtube ?? "",
            avatarUrl: data.avatarUrl ?? "",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
          };
        });

        setProfiles(list);
        setLoading(false);

        if (list.length === 0) {
          setForm(emptyProfile);
          setAvatarPreview(null);
          setActiveProfileId(null);
          setActiveProfile(null);
          return;
        }

        // If nothing active yet, pick the first profile
        if (!activeProfileId) {
          const first = list[0];
          setActiveProfileId(first.id);
          setActiveProfile({
            id: first.id,
            uid: first.uid,
            handle: first.handle,
            displayName: first.displayName,
            avatarUrl: first.avatarUrl,
          });
        }
      },
      (err) => {
        console.error("Error loading profiles", err);
        setErrorMessage("Could not load profiles.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, activeProfileId, setActiveProfile]);

  // Keep form in sync when active profile changes
  useEffect(() => {
    if (!activeProfileId) {
      return;
    }
    const current = profiles.find((p) => p.id === activeProfileId);
    if (current) {
      setForm({
        displayName: current.displayName,
        handle: current.handle,
        location: current.location,
        bio: current.bio,
        styles: current.styles,
        website: current.website,
        instagram: current.instagram,
        soundcloud: current.soundcloud,
        mixcloud: current.mixcloud,
        youtube: current.youtube,
        avatarUrl: current.avatarUrl,
      });
      setAvatarPreview(current.avatarUrl || null);
    }
  }, [activeProfileId, profiles]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Upload avatar + persist avatarUrl to Firestore
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setErrorMessage("You must be signed in to upload an avatar.");
      return;
    }

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    try {
      setErrorMessage(null);

      const path = `avatars/${user.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      setAvatarPreview(downloadUrl);
      setForm((prev) => ({ ...prev, avatarUrl: downloadUrl }));

      // Persist avatarUrl to Firestore
      if (activeProfileId) {
        const refDoc = doc(db, "profiles", activeProfileId);
        await setDoc(
          refDoc,
          {
            avatarUrl: downloadUrl,
            uid: user.uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        const refDoc = await addDoc(collection(db, "profiles"), {
          ...form,
          avatarUrl: downloadUrl,
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveProfileId(refDoc.id);
        setActiveProfile({
          id: refDoc.id,
          uid: user.uid,
          handle: form.handle,
          displayName: form.displayName,
          avatarUrl: downloadUrl,
        });
      }
    } catch (err) {
      console.error("Error uploading avatar", err);
      setErrorMessage("Could not upload avatar. Please try again.");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("You must be signed in to save your profile.");
      return;
    }

    const trimmedHandle = form.handle.trim();
    const normalizedHandle = trimmedHandle
      ? trimmedHandle.startsWith("@")
        ? trimmedHandle
        : `@${trimmedHandle}`
      : "";

    try {
      if (activeProfileId) {
        const refDoc = doc(db, "profiles", activeProfileId);
        await setDoc(
          refDoc,
          {
            ...form,
            handle: normalizedHandle,
            uid: user.uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Keep AuthContext activeProfile in sync
        setActiveProfile({
          id: activeProfileId,
          uid: user.uid,
          handle: normalizedHandle,
          displayName: form.displayName,
          avatarUrl: form.avatarUrl,
        });
      } else {
        const refDoc = await addDoc(collection(db, "profiles"), {
          ...form,
          handle: normalizedHandle,
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setActiveProfileId(refDoc.id);
        setActiveProfile({
          id: refDoc.id,
          uid: user.uid,
          handle: normalizedHandle,
          displayName: form.displayName,
          avatarUrl: form.avatarUrl,
        });
      }

      setSavedMessage("Profile saved!");
      setTimeout(() => setSavedMessage(null), 2000);
    } catch (err) {
      console.error("Error saving profile", err);
      setErrorMessage("Could not save profile. Please try again.");
    }
  }

  async function handleAddNewProfile() {
    setErrorMessage(null);
    if (!user) {
      setErrorMessage("Please sign in to create a profile.");
      return;
    }

    try {
      const newProfile: ProfileState = {
        ...emptyProfile,
        displayName: "New Profile",
        handle: "@yourdjname",
      };

      const refDoc = await addDoc(collection(db, "profiles"), {
        ...newProfile,
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setActiveProfileId(refDoc.id);
      setForm(newProfile);
      setAvatarPreview(null);

      setActiveProfile({
        id: refDoc.id,
        uid: user.uid,
        handle: newProfile.handle,
        displayName: newProfile.displayName,
        avatarUrl: newProfile.avatarUrl,
      });
    } catch (err) {
      console.error("Error creating profile", err);
      setErrorMessage("Could not create a new profile.");
    }
  }

  async function handleDeleteCurrentProfile() {
    setErrorMessage(null);

    if (!user) {
      setErrorMessage("Please sign in to delete a profile.");
      return;
    }

    if (!activeProfileId) {
      setErrorMessage("No active profile to delete.");
      return;
    }

    const current = profiles.find((p) => p.id === activeProfileId);
    const name = current?.displayName || current?.handle || "this profile";

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${name}? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const refDoc = doc(db, "profiles", activeProfileId);
      await deleteDoc(refDoc);

      // Clear local + global active profile; snapshot will repopulate list
      setActiveProfileId(null);
      setActiveProfile(null);
      setForm(emptyProfile);
      setAvatarPreview(null);
      setSavedMessage("Profile deleted.");
      setTimeout(() => setSavedMessage(null), 2000);
    } catch (err) {
      console.error("Error deleting profile", err);
      setErrorMessage("Could not delete profile. Please try again.");
    }
  }

  const currentHandleFirstLetter =
    form.handle.replace("@", "").trim().charAt(0).toUpperCase() || "D";

  const avatarSrc = avatarPreview || form.avatarUrl || null;

  return (
    <div className="main-shell">
      <div className="feed-header">
        <h1>Profile</h1>
        <p>
          Set your handle, bio, links and avatar so other turntablists know
          who&apos;s behind the cuts. You can keep multiple profiles for
          different aliases and switch between them.
        </p>
      </div>

      {/* Profile tabs + add button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {profiles.map((p, index) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActiveProfileId(p.id);
              setActiveProfile({
                id: p.id,
                uid: p.uid,
                handle: p.handle,
                displayName: p.displayName,
                avatarUrl: p.avatarUrl,
              });
            }}
            style={{
              borderRadius: 999,
              border: "1px solid #000",
              padding: "0.25rem 0.9rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              background:
                p.id === activeProfileId ? "#000" : "rgba(255,255,255,0.9)",
              color: p.id === activeProfileId ? "#fff" : "#000",
              cursor: "pointer",
            }}
          >
            {p.displayName || `Profile ${index + 1}`}
          </button>
        ))}

        <button
          type="button"
          onClick={handleAddNewProfile}
          style={{
            borderRadius: 999,
            border: "1px dashed #444",
            padding: "0.25rem 0.9rem",
            fontSize: "0.8rem",
            fontWeight: 600,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          + Add new profile
        </button>
      </div>

      {loading && <p>Loading profiles…</p>}
      {errorMessage && (
        <p className="auth-error" style={{ marginBottom: "1rem" }}>
          {errorMessage}
        </p>
      )}

      {!loading && user && (
        <form onSubmit={handleSubmit}>
          <div className="profile-grid">
            {/* LEFT: main details */}
            <section className="feed-form profile-card">
              <h2 className="profile-section-title">Profile details</h2>

              <div className="feed-field">
                <label className="feed-label" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  className="feed-input"
                  value={form.displayName}
                  onChange={handleChange}
                />
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="handle">
                  DJ handle
                </label>
                <input
                  id="handle"
                  name="handle"
                  type="text"
                  className="feed-input"
                  value={form.handle}
                  onChange={handleChange}
                />
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="feed-input"
                  placeholder="City, country"
                  value={form.location}
                  onChange={handleChange}
                />
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="styles">
                  Styles / focus
                </label>
                <input
                  id="styles"
                  name="styles"
                  type="text"
                  className="feed-input"
                  placeholder="e.g. scratch, beat juggling, DMC style, party sets"
                  value={form.styles}
                  onChange={handleChange}
                />
              </div>

              <div className="feed-field">
                <label className="feed-label" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  className="feed-textarea"
                  rows={4}
                  placeholder="Tell people what you play, where you’ve battled, crews, etc."
                  value={form.bio}
                  onChange={handleChange}
                />
              </div>
            </section>

            {/* RIGHT: avatar + links */}
            <section className="feed-form profile-card">
              <h2 className="profile-section-title">Avatar & links</h2>

              <div className="profile-avatar-row">
                <div className="profile-avatar">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="profile-avatar-img"
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {currentHandleFirstLetter}
                    </div>
                  )}
                </div>
                <div className="feed-field" style={{ flex: 1 }}>
                  <label className="feed-label" htmlFor="avatar">
                    Profile picture
                  </label>
                  <input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="feed-input"
                  />
                </div>
              </div>

              <div className="profile-links-grid">
                <div className="feed-field">
                  <label className="feed-label" htmlFor="website">
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    className="feed-input"
                    placeholder="https://your-site.com"
                    value={form.website}
                    onChange={handleChange}
                  />
                </div>

                <div className="feed-field">
                  <label className="feed-label" htmlFor="instagram">
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    name="instagram"
                    type="url"
                    className="feed-input"
                    placeholder="https://instagram.com/yourdj"
                    value={form.instagram}
                    onChange={handleChange}
                  />
                </div>

                <div className="feed-field">
                  <label className="feed-label" htmlFor="soundcloud">
                    SoundCloud
                  </label>
                  <input
                    id="soundcloud"
                    name="soundcloud"
                    type="url"
                    className="feed-input"
                    placeholder="https://soundcloud.com/yourdj"
                    value={form.soundcloud}
                    onChange={handleChange}
                  />
                </div>

                <div className="feed-field">
                  <label className="feed-label" htmlFor="mixcloud">
                    Mixcloud
                  </label>
                  <input
                    id="mixcloud"
                    name="mixcloud"
                    type="url"
                    className="feed-input"
                    placeholder="https://mixcloud.com/yourdj"
                    value={form.mixcloud}
                    onChange={handleChange}
                  />
                </div>

                <div className="feed-field">
                  <label className="feed-label" htmlFor="youtube">
                    YouTube channel
                  </label>
                  <input
                    id="youtube"
                    name="youtube"
                    type="url"
                    className="feed-input"
                    placeholder="https://youtube.com/@yourdj"
                    value={form.youtube}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>
          </div>

          <div
            className="feed-submit-row"
            style={{ marginTop: "1rem", gap: "0.75rem" }}
          >
            <button type="submit" className="feed-submit">
              Save profile
            </button>
            {savedMessage && (
              <span className="profile-saved-msg">{savedMessage}</span>
            )}

            {activeProfileId && profiles.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteCurrentProfile}
                style={{
                  marginLeft: "auto",
                  borderRadius: 999,
                  border: "1px solid #b91c1c",
                  padding: "0.25rem 0.9rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: "#fee2e2",
                  color: "#b91c1c",
                  cursor: "pointer",
                }}
              >
                Delete this profile
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}












