import { useState, useEffect } from "react";
import { 
  Mail, 
  Linkedin, 
  MapPin, 
  Calendar, 
  BookOpen, 
  Quote, 
  ShieldCheck, 
  Edit2, 
  Save, 
  Loader2, 
  Briefcase, 
  Phone 
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Props {
  isDarkMode: boolean;
  authSession: any;
}

interface AlumniProfile {
  id: string;
  full_name: string;
  email: string;
  major: string;
  graduation_year: number;
  job_title?: string;
  company_name?: string;
  bio?: string;
  linkedin_url?: string;
  phone?: string;
  avatar_url?: string;
  is_verified: boolean;
}

export default function AlumniProfilePage({ isDarkMode, authSession }: Props) {
  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phone, setPhone] = useState("");

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
    try {
      setIsSaving(true);
      const userId = authSession?.user?.id;
      if (!userId) throw new Error("No session found.");

      const updates = {
        full_name: fullName,
        job_title: jobTitle || null,
        company_name: companyName || null,
        bio: bio || null,
        linkedin_url: linkedinUrl || null,
        phone: phone || null,
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
      alert(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 self-center">
                      <ShieldCheck className="h-3 w-3" />
                      Verified Alumni
                    </span>
                  )}
                </div>

                {profile.job_title ? (
                  <p className="text-base font-semibold text-blue-500">
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
                  className="flex items-center gap-3 text-xs text-blue-500 hover:underline"
                >
                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                  <span>LinkedIn Profile</span>
                </a>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
