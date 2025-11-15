"use client";

import { FormEvent, useState, ChangeEvent } from "react";

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
};

const initialProfile: ProfileState = {
  displayName: "Anon Turntablist",
  handle: "@yourdjname",
  location: "",
  bio: "",
  styles: "",
  website: "",
  instagram: "",
  soundcloud: "",
  mixcloud: "",
  youtube: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleChange(
    e:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Profile save (stub only):", profile);
    setSavedMessage("Profile updated (not saved to a backend yet).");
    setTimeout(() => setSavedMessage(null), 2500);
  }

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>Profile</h1>
        <p>
          Set your handle, bio, and links so other turntablists know who&apos;s
          behind the cuts.
        </p>
      </div>

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
                value={profile.displayName}
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
                value={profile.handle}
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
                value={profile.location}
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
                value={profile.styles}
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
                value={profile.bio}
                onChange={handleChange}
              />
            </div>
          </section>

          {/* RIGHT: avatar + links */}
          <section className="feed-form profile-card">
            <h2 className="profile-section-title">Avatar & links</h2>

            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {profile.handle.replace("@", "").charAt(0).toUpperCase() ||
                      "D"}
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
                <p className="auth-subnote">
                  For now this only shows locally – we’ll wire up real uploads
                  later.
                </p>
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
                  value={profile.website}
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
                  value={profile.instagram}
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
                  value={profile.soundcloud}
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
                  value={profile.mixcloud}
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
                  value={profile.youtube}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="feed-submit-row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="feed-submit">
            Save profile
          </button>
          {savedMessage && (
            <span className="profile-saved-msg">{savedMessage}</span>
          )}
        </div>
      </form>
    </div>
  );
}



