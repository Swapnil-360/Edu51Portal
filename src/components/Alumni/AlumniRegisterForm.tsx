import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { supabase, supabaseConfigured } from "../../lib/supabase";

interface Props {
  isDarkMode: boolean;
  userId: string;
  userEmail: string;
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export default function AlumniRegisterForm({
  isDarkMode,
  userId,
  userEmail,
  onBack,
  onSubmitSuccess,
}: Props) {
  const cachedName = localStorage.getItem("userProfileName") || "";
  const cachedMajor = localStorage.getItem("userProfileMajor") || "CSE";

  const [fullName, setFullName] = useState(cachedName);
  const [email, setEmail] = useState(userEmail || localStorage.getItem("userProfileBubtEmail") || "");
  const [gradYear, setGradYear] = useState<number | "">(2024);
  const [major, setMajor] = useState(cachedMajor);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("Dhaka, Bangladesh");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");
  const [careerTips, setCareerTips] = useState("");
  const [mentorship, setMentorship] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSubmitSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onSubmitSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError("You must be logged in to register your alumni profile.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !gradYear || !major.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const profileData = {
      id: userId,
      full_name: fullName.trim(),
      email: email.trim(),
      avatar_url: localStorage.getItem("userProfilePic") || null,
      graduation_year: Number(gradYear),
      major: major,
      job_title: role.trim() || null,
      company_name: company.trim() || null,
      city: location.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      bio: bio.trim() || null,
      career_tips: careerTips.trim() || null,
      is_verified: false, // Default is unverified, pending admin action
      is_available_for_mentorship: mentorship,
      updated_at: new Date().toISOString(),
    };

    try {
      if (!supabaseConfigured) {
        // Mock success in offline mode
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSuccess(true);
      } else {
        const { error: insertErr } = await supabase
          .from("alumni_profiles")
          .upsert(profileData); // Use upsert so they can update or recreate if needed

        if (insertErr) throw insertErr;
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Error registering alumni profile:", err);
      setError(err?.message || "Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm";
  const inputBg = isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-300";
  const focusBorder = "focus:border-[#1e9df1]";

  if (success) {
    return (
      <div className={`min-h-screen pb-12 ${pageBg}`}>
        <div className="max-w-md mx-auto px-4 pt-16 text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className={`text-2xl font-bold ${textColor}`}>Registration Submitted!</h2>
            <p className={`text-sm ${subColor} leading-relaxed`}>
              Thank you for registering! Your profile has been submitted and is currently **pending verification**.
              Once verified by an admin, it will appear in the public alumni directory.
            </p>
          </div>
          <button
            onClick={onSubmitSuccess}
            className="w-full mt-4 py-2.5 rounded-lg bg-[#1e9df1] text-white text-sm font-semibold hover:bg-[#1677cc] transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Back Navigation */}
        <button
          onClick={onBack}
          className={`flex items-center gap-2 mb-6 text-sm font-semibold hover:underline ${textColor}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </button>

        {/* Form Container */}
        <div className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>
          <div>
            <h2 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
              <ShieldCheck className="h-6 w-6 text-[#1e9df1]" />
              Register as Alumni
            </h2>
            <p className={`text-xs ${subColor}`}>
              Create a profile to share your professional experience and advice with current BUBT students.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Required Fields Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Graduation Year */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Graduation Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2030}
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 2024"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Major */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Major <span className="text-red-500">*</span>
                </label>
                <select
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                >
                  <option value="CSE">CSE</option>
                  <option value="EEE">EEE</option>
                  <option value="BBA">BBA</option>
                  <option value="Textile">Textile</option>
                  <option value="Civil">Civil</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Professional Details Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#2f3336]/10 pt-4">
              {/* Current Role */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Current Job Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Current Company */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Current Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="e.g. https://linkedin.com/in/username"
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>

            {/* Bio and Tips */}
            <div className="space-y-4 border-t border-[#2f3336]/10 pt-4">
              {/* Bio */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Short Biography</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell students about your journey, interests, and background..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Career Tips */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Career Advice & Tips for Students</label>
                <textarea
                  value={careerTips}
                  onChange={(e) => setCareerTips(e.target.value)}
                  placeholder="What should students focus on? (e.g. learning DSA, networking, internship strategies...)"
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>

            {/* Mentorship Toggle */}
            <div className="flex items-center justify-between border-t border-[#2f3336]/10 pt-4 pb-2">
              <div className="flex flex-col">
                <span className={`text-xs font-semibold ${textColor}`}>Available for Mentorship</span>
                <span className={`text-[10px] ${subColor}`}>
                  Allow current students to connect with you via email for career advice.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentorship}
                  onChange={(e) => setMentorship(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${
                    isDarkMode ? "bg-slate-800" : "bg-slate-200"
                  } peer-checked:bg-[#1e9df1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full`}
                ></div>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 border-t border-[#2f3336]/10 pt-4">
              <button
                type="button"
                onClick={onBack}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border ${
                  isDarkMode
                    ? "border-slate-700 hover:bg-slate-800 text-white"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] disabled:bg-[#1e9df1]/60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#1e9df1]/10"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Registration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
