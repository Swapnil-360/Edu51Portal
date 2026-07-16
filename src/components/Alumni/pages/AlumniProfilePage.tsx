import { useState, useEffect } from "react";
import {
  Mail,
  Linkedin,
  Calendar,
  BookOpen,
  Quote,
  ShieldCheck,
  Edit2,
  Save,
  Loader2,
  Phone,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { AlumniProfile, Experience } from "../../../types/social";
import { listExperiences } from "../../../lib/api/profileApi";
import { validateAndSanitizeUrl, normalizeWhatsAppLink } from "../../../lib/sanitize";
import SkillsEditor, { BadgeList, CSE_SKILL_SUGGESTIONS } from "../../Profile/SkillsEditor";
import ExperienceSection from "../../Profile/ExperienceSection";

interface Props {
  isDarkMode: boolean;
  authSession: any;
}

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Prefer not to say"];

export default function AlumniProfilePage({ isDarkMode, authSession }: Props) {
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Form states
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [contactMode, setContactMode] = useState<"website" | "social" | "both">("website");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [telegram, setTelegram] = useState("");
  const [xLink, setXLink] = useState("");
  const [instagram, setInstagram] = useState("");

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const inputBg = isDarkMode ? "bg-[#16181c] border-[#2f3336] text-white" : "bg-white border-slate-200 text-slate-900";

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userId = authSession?.user?.id;
      if (!userId) throw new Error("No session found.");

      const { data, error: fetchErr } = await supabase
        .from("alumni_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setJobTitle(data.job_title || "");
        setCompanyName(data.company_name || "");
        setBio(data.bio || "");
        setLinkedinUrl(data.linkedin_url || "");
        setPhone(data.phone || "");
        setMaritalStatus(data.marital_status || "");
        setPortfolioUrl(data.portfolio_url || "");
        setSkills(data.skills || []);
        setAchievements(data.achievements || []);
        setContactMode(data.contact_mode || "website");
        const links: Record<string, string> = data.social_links || {};
        setWhatsapp(links.whatsapp || "");
        setFacebook(links.facebook || "");
        setTelegram(links.telegram || "");
        setXLink(links.x || "");
        setInstagram(links.instagram || "");

        const exp = await listExperiences(userId);
        setExperiences(exp);
      } else {
        setError("Alumni profile not found.");
      }
    } catch (err: any) {
      console.error("Error fetching alumni profile:", err);
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [authSession]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    const linkedinResult = validateAndSanitizeUrl(linkedinUrl, "LinkedIn");
    if (linkedinResult.error) return setSaveError(linkedinResult.error);
    const portfolioResult = validateAndSanitizeUrl(portfolioUrl, "Portfolio");
    if (portfolioResult.error) return setSaveError(portfolioResult.error);
    const whatsappResult = normalizeWhatsAppLink(whatsapp);
    if (whatsappResult.error) return setSaveError(whatsappResult.error);
    const facebookResult = validateAndSanitizeUrl(facebook, "Facebook");
    if (facebookResult.error) return setSaveError(facebookResult.error);
    const telegramResult = validateAndSanitizeUrl(telegram, "Telegram");
    if (telegramResult.error) return setSaveError(telegramResult.error);
    const xResult = validateAndSanitizeUrl(xLink, "X");
    if (xResult.error) return setSaveError(xResult.error);
    const instagramResult = validateAndSanitizeUrl(instagram, "Instagram");
    if (instagramResult.error) return setSaveError(instagramResult.error);

    const social_links: Record<string, string> = {};
    if (whatsappResult.url) social_links.whatsapp = whatsappResult.url;
    if (facebookResult.url) social_links.facebook = facebookResult.url;
    if (telegramResult.url) social_links.telegram = telegramResult.url;
    if (xResult.url) social_links.x = xResult.url;
    if (instagramResult.url) social_links.instagram = instagramResult.url;

    try {
      setIsSaving(true);
      const userId = authSession?.user?.id;
      if (!userId) throw new Error("No session found.");

      const updates = {
        full_name: fullName,
        job_title: jobTitle || null,
        company_name: companyName || null,
        bio: bio || null,
        linkedin_url: linkedinResult.url || null,
        phone: phone || null,
        marital_status: maritalStatus || null,
        portfolio_url: portfolioResult.url || null,
        skills,
        achievements,
        contact_mode: contactMode,
        social_links,
      };

      // 1. Update alumni_profiles table
      const { error: err1 } = await supabase
        .from("alumni_profiles")
        .update(updates)
        .eq("id", userId);

      if (err1) throw err1;

      // 2. Update main profiles table
      const { error: err2 } = await supabase
        .from("profiles")
        .update({
          name: fullName,
          phone: phone || null,
        })
        .eq("id", userId);

      if (err2) throw err2;

      // Reload local state
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      setIsEditing(false);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setSaveError(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1e9df1]"></div>
        <span className={`text-xs ${subColor}`}>Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-sm mb-4">{error || "Failed to load profile."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>

        {/* Header Action Row */}
        <div className="flex justify-between items-center pb-4 border-b border-[#2f3336]/10">
          <h2 className={`text-xl font-bold ${textColor}`}>My Alumni Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e9df1] hover:bg-[#1677cc] text-white transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-5">
            {saveError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Google"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Marital Status</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                >
                  <option value="">Prefer not to say</option>
                  {MARITAL_STATUS_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Portfolio URL</label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>LinkedIn URL</label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Write a brief professional summary about yourself..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Skills</label>
              <SkillsEditor
                items={skills}
                onChange={setSkills}
                isDarkMode={isDarkMode}
                badgeColor="blue"
                suggestions={CSE_SKILL_SUGGESTIONS}
                placeholder="Add a skill…"
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Achievements / Certifications</label>
              <SkillsEditor
                items={achievements}
                onChange={setAchievements}
                isDarkMode={isDarkMode}
                badgeColor="emerald"
                placeholder="e.g. AWS Certified Solutions Architect"
              />
            </div>

            {/* Mentorship Contact Preference */}
            <div className="pt-4 border-t border-[#2f3336]/10 space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Mentorship Contact Preference</label>
                <p className={`text-[11px] mb-2 ${subColor}`}>
                  Choose how students can reach you for mentorship.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {([
                    { value: "website", label: "Website chat only" },
                    { value: "social", label: "Social media only" },
                    { value: "both", label: "Both" },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer flex-1 ${
                        contactMode === opt.value
                          ? "border-[#1e9df1] bg-[#1e9df1]/10 text-[#1e9df1]"
                          : isDarkMode
                          ? "border-[#2f3336] text-[#8b98a5]"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="contactMode"
                        value={opt.value}
                        checked={contactMode === opt.value}
                        onChange={() => setContactMode(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(contactMode === "social" || contactMode === "both") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>WhatsApp</label>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+8801XXXXXXXXX or wa.me link"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Facebook</label>
                    <input
                      type="text"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="URL"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Telegram</label>
                    <input
                      type="text"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="URL"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>X (Twitter)</label>
                    <input
                      type="text"
                      value={xLink}
                      onChange={(e) => setXLink(e.target.value)}
                      placeholder="URL"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textColor}`}>Instagram</label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="URL"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${inputBg}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                  isDarkMode
                    ? "bg-[#16181c] border-[#2f3336] text-[#d9d9d9] hover:bg-[#2f3336]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Top Row: Avatar and Name */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#1e9df1] to-[#1677cc] flex items-center justify-center text-3xl font-bold text-white shadow-md flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.full_name?.charAt(0)?.toUpperCase() ?? "?"}</span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                  <h2 className={`text-2xl font-bold ${textColor}`}>{profile.full_name}</h2>
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1e9df1]/10 text-[#1e9df1] border border-[#1e9df1]/20 self-center">
                      <ShieldCheck className="h-3 w-3" />
                      Verified Alumni
                    </span>
                  )}
                </div>

                {profile.job_title ? (
                  <p className="text-base font-semibold text-[#1e9df1]">
                    {profile.job_title}
                    {profile.company_name ? ` at ${profile.company_name}` : ""}
                  </p>
                ) : (
                  <p className={`text-sm italic ${subColor}`}>Graduate</p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                    <span className="uppercase">{profile.major}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Graduated: {profile.graduation_year}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className={`p-4 rounded-xl border flex gap-3 ${
                isDarkMode ? "bg-slate-900/40 border-[#2f3336]/40" : "bg-slate-50 border-slate-100"
              }`}>
                <Quote className="h-5 w-5 text-slate-500 flex-shrink-0 rotate-180" />
                <p className={`text-sm italic leading-relaxed ${textColor}`}>{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wide mb-2 ${subColor}`}>Skills</h3>
                <BadgeList items={profile.skills} isDarkMode={isDarkMode} badgeColor="blue" />
              </div>
            )}

            {/* Achievements */}
            {profile.achievements && profile.achievements.length > 0 && (
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wide mb-2 ${subColor}`}>Achievements / Certifications</h3>
                <BadgeList items={profile.achievements} isDarkMode={isDarkMode} badgeColor="emerald" />
              </div>
            )}

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#2f3336]/10">
              <div className="flex items-center gap-3 text-xs">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className={subColor}>{profile.email}</span>
              </div>

              {profile.phone && (
                <div className="flex items-center gap-3 text-xs">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className={subColor}>{profile.phone}</span>
                </div>
              )}

              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-xs text-[#1e9df1] hover:underline"
                >
                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                  <span>LinkedIn Profile</span>
                </a>
              )}

              {profile.portfolio_url && (
                <a
                  href={profile.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-xs text-[#1e9df1] hover:underline"
                >
                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Portfolio</span>
                </a>
              )}
            </div>

          </div>
        )}
      </div>

      {!isEditing && (
        <ExperienceSection
          userId={authSession.user.id}
          experiences={experiences}
          isOwn={true}
          isDarkMode={isDarkMode}
          onChanged={() => listExperiences(authSession.user.id).then(setExperiences)}
        />
      )}
    </div>
  );
}
