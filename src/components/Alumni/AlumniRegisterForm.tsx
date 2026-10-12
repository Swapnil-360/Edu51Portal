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
  const cardBg = isDarkMode ? "bg-[#0c1017] border-[#1d2638] shadow-2xl" : "bg-white border-slate-200 shadow-sm";
  const inputBg = isDarkMode ? "bg-[#070b12] border-[#1d2638]" : "bg-white border-slate-300";
  const focusBorder = "focus:border-red-500 focus:ring-1 focus:ring-red-500/30";

  if (success) {
    return (
      <div className={`min-h-screen pb-12 ${pageBg}`}>
        <div className="max-w-md mx-auto px-4 pt-16 text-center flex flex-col items-center gap-5">
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src="/Edu51Portal.png"
              alt="Edu51Portal Logo"
              className="w-10 h-10 object-contain rounded-xl border border-red-500/30 shadow-md shadow-red-950/40"
            />
            <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              Edu<span className="text-red-500">51</span>Portal
            </span>
          </div>

          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/20">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h2 className={`text-2xl font-bold text-white`} style={{ fontFamily: "'Exo 2', sans-serif" }}>
              Registration Submitted!
            </h2>
            <p className={`text-xs ${subColor} leading-relaxed max-w-sm`}>
              Thank you for registering! Your profile has been submitted and is currently <strong className="text-white">pending verification</strong>.
              Once verified by an admin, it will appear in the public alumni directory.
            </p>
          </div>
          <button
            onClick={onSubmitSuccess}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-xl shadow-red-600/30"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            Back to Alumni Directory
          </button>
          <p className="text-[11px] text-slate-500 mt-2">
            Presented by Team <strong className="text-white">CoreWe5</strong> · BUBT Intake 51
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Top Brand Navigation Bar */}
        <div className="flex items-center justify-between py-3 mb-4">
          <div className="flex items-center gap-3">
            <img
              src="/Edu51Portal.png"
              alt="Edu51Portal Logo"
              className="w-10 h-10 object-contain rounded-xl border border-red-500/40 shadow-md shadow-red-950/40"
            />
            <div>
              <span
                className="text-lg font-bold tracking-tight text-white block leading-tight"
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                Edu<span className="text-red-500">51</span>Portal
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Official BUBT Academic & Alumni Registry
              </span>
            </div>
          </div>
          <button
            onClick={onBack}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isDarkMode
                ? "border-[#1d2638] text-slate-300 hover:text-white hover:border-red-500/50 bg-[#0c1017]"
                : "border-slate-200 text-slate-700 hover:bg-slate-100 bg-white"
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Directory
          </button>
        </div>

        {/* Form Container */}
        <div className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>
          <div className="border-b border-[#1d2638] pb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              <ShieldCheck className="h-6 w-6 text-red-500" />
              Register as BUBT Alumni
            </h2>
            <p className={`text-xs ${subColor} mt-1 leading-relaxed`}>
              Join the official Edu51Portal Alumni Directory. Share your professional milestones, guide juniors, and connect with BUBT graduates.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Required Fields Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Full Academic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
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
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
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
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Major */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Department / Major <span className="text-red-500">*</span>
                </label>
                <select
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                >
                  <option value="CSE" className="bg-[#0c1017] text-white">CSE</option>
                  <option value="EEE" className="bg-[#0c1017] text-white">EEE</option>
                  <option value="BBA" className="bg-[#0c1017] text-white">BBA</option>
                  <option value="Textile" className="bg-[#0c1017] text-white">Textile</option>
                  <option value="Civil" className="bg-[#0c1017] text-white">Civil</option>
                  <option value="Economics" className="bg-[#0c1017] text-white">Economics</option>
                  <option value="English" className="bg-[#0c1017] text-white">English</option>
                  <option value="Law" className="bg-[#0c1017] text-white">Law</option>
                  <option value="Mathematics" className="bg-[#0c1017] text-white">Mathematics</option>
                  <option value="Other" className="bg-[#0c1017] text-white">Other</option>
                </select>
              </div>
            </div>

            {/* Professional Details Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#1d2638] pt-4">
              {/* Current Role */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Current Job Title</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Current Company */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Current Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Brain Station 23 / Google"
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
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
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
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
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>

            {/* Bio and Tips */}
            <div className="space-y-4 border-t border-[#1d2638] pt-4">
              {/* Bio */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Short Biography</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell students about your journey, interests, and background..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
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
                  className={`w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>

            {/* Mentorship Toggle */}
            <div className="flex items-center justify-between border-t border-[#1d2638] pt-4 pb-2">
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
                  } peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full`}
                ></div>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 border-t border-[#1d2638] pt-4">
              <button
                type="button"
                onClick={onBack}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border ${
                  isDarkMode
                    ? "border-[#1d2638] hover:bg-[#121824] text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                } transition-colors`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-600/30"
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Registration
              </button>
            </div>
          </form>

          {/* Footer Attribution */}
          <div className="pt-4 border-t border-[#1d2638] text-center text-xs text-slate-500">
            Presented by Team <strong className="text-white font-bold">CoreWe5</strong> · BUBT Intake 51
          </div>
        </div>
      </div>
    </div>
  );
}
