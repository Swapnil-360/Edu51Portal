import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { SocialProfile, ProfileVisibility } from "../../types/social";
import { updateProfile } from "../../lib/api/profileApi";
import { validateAndSanitizeUrl } from "../../lib/sanitize";

interface Props {
  profile: SocialProfile;
  onClose: () => void;
  onSaved: () => void;
  isDarkMode: boolean;
}

export default function EditBasicInfoModal({ profile, onClose, onSaved, isDarkMode }: Props) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [linkedin, setLinkedin] = useState(profile.social_links?.linkedin ?? "");
  const [github, setGithub] = useState(profile.social_links?.github ?? "");
  const [facebook, setFacebook] = useState(profile.social_links?.facebook ?? "");
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    // Helper to strip HTML tags to prevent HTML Injection / XSS
    const stripHtml = (text: string) => {
      return text.replace(/<\/?[^>]+(>|$)/g, "");
    };

    const sanitizedName = stripHtml(name.trim());
    const sanitizedHeadline = stripHtml(headline.trim());
    const sanitizedAbout = stripHtml(about.trim());
    const sanitizedLocation = stripHtml(location.trim());

    if (!sanitizedName) {
      setError("Name is required.");
      return;
    }
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_.]{3,30}$/.test(uname)) {
      setError("Username must be 3-30 characters: letters, numbers, dot, underscore.");
      return;
    }

    const websiteResult = validateAndSanitizeUrl(website, "Website");
    if (websiteResult.error) {
      setError(websiteResult.error);
      return;
    }

    const linkedinResult = validateAndSanitizeUrl(linkedin, "LinkedIn");
    if (linkedinResult.error) {
      setError(linkedinResult.error);
      return;
    }

    const githubResult = validateAndSanitizeUrl(github, "GitHub");
    if (githubResult.error) {
      setError(githubResult.error);
      return;
    }

    const facebookResult = validateAndSanitizeUrl(facebook, "Facebook");
    if (facebookResult.error) {
      setError(facebookResult.error);
      return;
    }

    setSaving(true);
    setError("");

    const social_links: Record<string, string> = {};
    if (linkedinResult.url) social_links.linkedin = linkedinResult.url;
    if (githubResult.url) social_links.github = githubResult.url;
    if (facebookResult.url) social_links.facebook = facebookResult.url;

    const { error: err } = await updateProfile(profile.id, {
      name: sanitizedName,
      username: uname || undefined,
      headline: sanitizedHeadline || null,
      about: sanitizedAbout || null,
      location: sanitizedLocation || null,
      website: websiteResult.url || null,
      social_links,
      visibility,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved();
    onClose();
  };

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-[#1e9df1]"
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          isDarkMode ? "bg-[#17181c] border border-[#2f3336]" : "bg-white"
        }`}
      >
        <div
          className={`sticky top-0 px-5 py-4 border-b flex items-center justify-between ${
            isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200"
          }`}
        >
          <h2 className={`text-lg font-bold ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>
            Edit Profile Details
          </h2>
          <button onClick={onClose} className={isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500 hover:text-slate-900"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your.username" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Headline</label>
            <input
              className={inputCls}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. CSE Student @ BUBT · Aspiring Web Developer"
              maxLength={120}
            />
          </div>

          <div>
            <label className={labelCls}>About</label>
            <textarea
              className={`${inputCls} min-h-[100px] resize-y`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell people about yourself…"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="URL" />
            </div>
            <div>
              <label className={labelCls}>GitHub</label>
              <input className={inputCls} value={github} onChange={(e) => setGithub(e.target.value)} placeholder="URL" />
            </div>
            <div>
              <label className={labelCls}>Facebook</label>
              <input className={inputCls} value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="URL" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Profile Visibility</label>
            <select
              className={inputCls}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}
            >
              <option value="public">Public — anyone can view</option>
              <option value="users">Edu51Portal users only</option>
              <option value="private">Private — only you</option>
            </select>
          </div>
        </div>

        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isDarkMode ? "bg-[#16181c] text-[#8b98a5] hover:bg-[#2f3336]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm font-medium hover:bg-[#1677cc] disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

