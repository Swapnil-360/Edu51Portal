import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Building,
  Briefcase,
  Mail,
  User,
  MapPin,
  Globe,
  Linkedin,
  Facebook,
  Phone,
  GraduationCap,
} from "lucide-react";
import { supabase, supabaseConfigured } from "../../lib/supabase";

interface Props {
  isDarkMode: boolean;
  userId?: string;
  userEmail?: string;
  onBack: () => void;
  onSubmitSuccess: () => void;
}

const DEPARTMENTS = [
  "CSE",
  "EEE",
  "Civil",
  "Textile",
  "BBA",
  "Economics",
  "English",
  "Law",
  "Mathematics",
  "Other",
];

export default function AlumniRegisterForm({
  isDarkMode,
  userId,
  userEmail,
  onBack,
  onSubmitSuccess,
}: Props) {
  // Privacy & Fresh Form: Never auto-fill with cached student profile from localStorage
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [major, setMajor] = useState("CSE");
  const [gradYear, setGradYear] = useState<number | "">(2024);
  const [intake, setIntake] = useState<number | "">("");

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("Dhaka, Bangladesh");

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [phone, setPhone] = useState("");

  const [bio, setBio] = useState("");
  const [careerTips, setCareerTips] = useState("");
  const [mentorship, setMentorship] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onSubmitSuccess();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, onSubmitSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Required fields check
    if (!fullName.trim() || !email.trim() || !gradYear || !major.trim()) {
      setError("Please fill out all required academic fields marked with *.");
      return;
    }

    // Password validation for new sign-ups
    if (!userId) {
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify and re-enter.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      let activeUserId = userId;

      if (!supabaseConfigured) {
        // Offline demo mode
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSuccess(true);
        return;
      }

      // 1. If not logged in, create user via Supabase Auth
      if (!activeUserId) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: cleanName,
              role: "alumni",
              department: major,
            },
          },
        });

        if (authErr) {
          if (authErr.message.toLowerCase().includes("already registered")) {
            setError(
              "An account with this email already exists. Please sign in or use another email."
            );
            setSubmitting(false);
            return;
          }
          throw authErr;
        }

        activeUserId = authData.user?.id;
      }

      if (!activeUserId) {
        throw new Error("Unable to establish account session. Please try again.");
      }

      // 2. Insert / Upsert into profiles table
      const profileRecord = {
        id: activeUserId,
        name: cleanName,
        bubt_email: cleanEmail,
        role: "alumni",
        is_alumni: true,
        is_verified: false,
        department: major,
        section: "Alumni",
        major: major,
        phone: phone.trim() || null,
        created_at: new Date().toISOString(),
      };

      await supabase.from("profiles").upsert(profileRecord, { onConflict: "id" });

      // 3. Upsert into alumni_profiles table
      const alumniProfileRecord = {
        id: activeUserId,
        full_name: cleanName,
        email: cleanEmail,
        graduation_year: Number(gradYear),
        major: major,
        job_title: role.trim() || null,
        company_name: company.trim() || null,
        city: location.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        career_tips: careerTips.trim() || null,
        is_verified: false, // Default is pending admin verification
        is_available_for_mentorship: mentorship,
        updated_at: new Date().toISOString(),
      };

      const { error: alumniErr } = await supabase
        .from("alumni_profiles")
        .upsert(alumniProfileRecord, { onConflict: "id" });

      if (alumniErr) throw alumniErr;

      // 4. Send in-app notification to all admins for approval
      try {
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_admin", true);

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            type: "alumni_approval",
            title: "New Alumni Registration",
            body: `${cleanName} (${major}, Class of ${gradYear}) submitted their alumni profile and is pending verification.`,
            actor_id: activeUserId,
            actor_name: cleanName,
            read: false,
          }));
          await supabase.from("notifications").insert(notifications);
        }
      } catch (notifErr) {
        console.warn("Non-fatal: Failed to send admin notification:", notifErr);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Error registering alumni profile:", err);
      setError(err?.message || "Failed to submit registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-600";
  const cardBg = isDarkMode
    ? "bg-[#0c1017] border-[#1d2638] shadow-2xl"
    : "bg-white border-slate-200 shadow-xl";
  const inputBg = isDarkMode
    ? "bg-[#070b12] border-[#1d2638] text-white placeholder-slate-500"
    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400";
  const borderDivider = isDarkMode ? "border-[#1d2638]" : "border-slate-200";
  const focusBorder = "focus:border-red-500 focus:ring-1 focus:ring-red-500/30";

  if (success) {
    return (
      <div className={`min-h-screen py-16 px-4 flex items-center justify-center ${pageBg}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-2xl ${cardBg}`}>
          {/* Brand Wordmark */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img
              src="/Edu51Portal.png"
              alt="Edu51Portal Logo"
              className="w-10 h-10 object-contain rounded-xl border border-red-500/30 shadow-md shadow-red-950/40"
            />
            <span
              className={`text-xl font-bold tracking-tight ${textColor}`}
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              Edu<span className="text-red-500">51</span>Portal
            </span>
          </div>

          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-lg shadow-emerald-950/20">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3">
            Registration Submitted Successfully
          </span>

          <h2
            className={`text-2xl font-bold mb-2 ${textColor}`}
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            Welcome to the Network!
          </h2>

          <p className={`text-xs leading-relaxed mb-6 ${subColor}`}>
            Thank you for registering as a BUBT alumnus! Your profile has been saved and is currently{" "}
            <strong className={textColor}>pending administrative verification</strong>. Once reviewed by an administrator, your badge will be active and your profile will appear in the public alumni directory.
          </p>

          <button
            onClick={onSubmitSuccess}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-xl shadow-red-600/30"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            Return to Alumni Directory
          </button>

          <p className="text-[11px] text-slate-500 mt-6">
            Presented by Team <strong className={textColor}>CoreWe5</strong> · BUBT Intake 51
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center ${pageBg}`}>
      {/* Top Brand Navigation Bar */}
      <div className="flex items-center justify-between py-3 px-2 max-w-2xl w-full mb-4">
        <div className="flex items-center gap-3">
          <img
            src="/Edu51Portal.png"
            alt="Edu51Portal Logo"
            className="w-10 h-10 object-contain rounded-xl border border-red-500/40 shadow-md shadow-red-950/40"
          />
          <div>
            <span
              className={`text-lg font-bold tracking-tight block leading-tight ${textColor}`}
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              Edu<span className="text-red-500">51</span>Portal
            </span>
            <span className={`text-[10px] font-medium tracking-wide ${subColor}`}>
              Official BUBT Academic & Alumni Registry
            </span>
          </div>
        </div>

        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isDarkMode
              ? "border-[#1d2638] text-slate-300 hover:text-white hover:border-red-500/50 bg-[#0c1017]"
              : "border-slate-300 text-slate-700 hover:text-slate-900 hover:border-red-500/50 bg-white shadow-sm"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Directory
        </button>
      </div>

      {/* Main Registration Card */}
      <div className={`max-w-2xl w-full rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>
        {/* Card Header */}
        <div className={`border-b ${borderDivider} pb-4`}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
              <Sparkles className="w-3 h-3 text-red-400" />
              Official BUBT Graduate Registration
            </span>
            <span className={`text-[11px] font-medium ${subColor}`}>
              Intake 1 – Present
            </span>
          </div>

          <h2
            className={`text-2xl font-bold flex items-center gap-2 ${textColor}`}
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            <ShieldCheck className="h-6 w-6 text-red-500" />
            Join the Alumni Community
          </h2>
          <p className={`text-xs mt-1 leading-relaxed ${subColor}`}>
            Create your permanent profile on the Edu51Portal Alumni Registry. Inspire BUBT juniors, mentor rising talents, and connect with fellow graduates across industries.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Credentials (if not logged in) */}
          <div className="space-y-3">
            <div
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-500"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Basic Information</span>
            </div>

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
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Contact / Academic Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alumni@domain.com"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>

            {/* Password Creation (Only if not already authenticated) */}
            {!userId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${textColor}`}>
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-semibold ${textColor}`}>
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Academic Background */}
          <div className={`space-y-3 border-t ${borderDivider} pt-4`}>
            <div
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-500"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>2. Academic Background</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Department */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className={isDarkMode ? "bg-[#0c1017] text-white" : "bg-white text-slate-900"}>
                      {dept}
                    </option>
                  ))}
                </select>
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
                  onChange={(e) =>
                    setGradYear(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 2024"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Intake */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>
                  Intake (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={intake}
                  onChange={(e) =>
                    setIntake(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 51"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Professional Career */}
          <div className={`space-y-3 border-t ${borderDivider} pt-4`}>
            <div
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-500"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>3. Professional Career</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Current Job Title / Designation</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer / Data Scientist"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor}`}>Company / Organization</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Brain Station 23 / Therap / Google"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Location */}
              <div className="space-y-1 md:col-span-2">
                <label className={`text-xs font-semibold ${textColor}`}>Current City / Country</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Dhaka, Bangladesh"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Social Links & Contact */}
          <div className={`space-y-3 border-t ${borderDivider} pt-4`}>
            <div
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-500"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>4. Social Links & Connectivity</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LinkedIn */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor} flex items-center gap-1`}>
                  <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                  <span>LinkedIn Profile</span>
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Facebook */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor} flex items-center gap-1`}>
                  <Facebook className="w-3.5 h-3.5 text-blue-500" />
                  <span>Facebook Profile</span>
                </label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/username"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1">
                <label className={`text-xs font-semibold ${textColor} flex items-center gap-1`}>
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp / Phone</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 17XXXXXXXX"
                  className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${inputBg} ${textColor} ${focusBorder}`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Journey & Advice */}
          <div className={`space-y-4 border-t ${borderDivider} pt-4`}>
            <div
              className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-red-500"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>5. Mentorship & Guidance</span>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className={`text-xs font-semibold ${textColor}`}>
                Brief Summary of Your Journey
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a short summary of your career journey, tech stack, or professional accomplishments..."
                rows={3}
                className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
              />
            </div>

            {/* Career Tips */}
            <div className="space-y-1">
              <label className={`text-xs font-semibold ${textColor}`}>
                Career Advice for BUBT Juniors
              </label>
              <textarea
                value={careerTips}
                onChange={(e) => setCareerTips(e.target.value)}
                placeholder="What advice would you give to current students? (e.g. learning DSA, portfolio building, internships...)"
                rows={3}
                className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors resize-none ${inputBg} ${textColor} ${focusBorder}`}
              />
            </div>

            {/* Mentorship Availability Checkbox */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
              isDarkMode ? 'bg-[#070b12] border-[#1d2638]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col">
                <span className={`text-xs font-semibold ${textColor}`}>
                  Open for Student Mentorship
                </span>
                <span className={`text-[11px] ${subColor}`}>
                  Allow juniors to connect with you for career guidance and advice.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentorship}
                  onChange={(e) => setMentorship(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-checked:bg-red-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex items-center gap-3 border-t ${borderDivider} pt-5`}>
            <button
              type="button"
              onClick={onBack}
              className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-colors ${
                isDarkMode
                  ? "border-[#1d2638] hover:bg-[#121824] text-slate-300"
                  : "border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30"
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Complete Alumni Registration</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Attribution */}
        <div className={`pt-4 border-t ${borderDivider} text-center text-xs ${subColor}`}>
          Presented by Team <strong className={textColor}>CoreWe5</strong> · BUBT Intake 51
        </div>
      </div>
    </div>
  );
}
