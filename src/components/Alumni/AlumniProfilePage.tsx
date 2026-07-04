import { ArrowLeft, Mail, Linkedin, MapPin, Calendar, BookOpen, Quote, ShieldCheck } from "lucide-react";
import { useAlumniById } from "../../hooks/useAlumni";

interface Props {
  id: string;
  isDarkMode: boolean;
  onBack: () => void;
}

export default function AlumniProfilePage({ id, isDarkMode, onBack }: Props) {
  const { alumni, loading, error } = useAlumniById(id);

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm";

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${pageBg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1e9df1]"></div>
          <span className={`text-xs ${subColor}`}>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !alumni) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-center ${pageBg}`}>
        <p className="text-red-400 text-sm mb-4">{error || "Profile not found."}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-xs font-semibold hover:bg-[#1677cc]"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Back Navigation */}
        <button
          onClick={onBack}
          className={`flex items-center gap-2 mb-6 text-sm font-semibold hover:underline ${textColor}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </button>

        {/* Profile Card */}
        <div className={`rounded-2xl border p-6 md:p-8 flex flex-col gap-6 ${cardBg}`}>
          {/* Top Header Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left">
            {/* Big Avatar */}
            <div
              className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#1e9df1] to-[#1677cc] flex items-center justify-center text-3xl font-bold text-white shadow-md flex-shrink-0"
            >
              {alumni.avatar_url ? (
                <img src={alumni.avatar_url} alt={alumni.full_name} className="w-full h-full object-cover" />
              ) : (
                <span>
                  {alumni.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>

            {/* Name and Basic Role */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h2 className={`text-2xl font-bold ${textColor}`}>
                  {alumni.full_name}
                </h2>
                {alumni.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1e9df1]/10 text-[#1e9df1] border border-[#1e9df1]/20 self-center">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Alumni
                  </span>
                )}
              </div>

              {alumni.current_role ? (
                <p className={`text-base font-semibold ${isDarkMode ? "text-[#1e9df1]" : "text-[#1677cc]"}`}>
                  {alumni.current_role}
                  {alumni.current_company ? ` at ${alumni.current_company}` : ""}
                </p>
              ) : (
                <p className={`text-sm italic ${subColor}`}>Graduate</p>
              )}

              {/* Info Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  <span className="uppercase">{alumni.major}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Class of {alumni.graduation_year}
                </span>
                {alumni.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {alumni.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons row */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 border-t border-b border-[#2f3336]/10 py-4">
            {alumni.linkedin_url && (
              <a
                href={alumni.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white text-xs font-semibold hover:bg-[#006399] transition-colors shadow-sm"
              >
                <Linkedin className="h-4 w-4" />
                Connect on LinkedIn
              </a>
            )}
            <a
              href={`mailto:${alumni.email}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </a>
            {alumni.is_available_for_mentorship && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                ✓ Available to Mentor Students
              </span>
            )}
          </div>

          {/* Bio Section */}
          {alumni.bio && (
            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                About
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                {alumni.bio}
              </p>
            </div>
          )}

          {/* Career Tips Section */}
          {alumni.career_tips && (
            <div className="space-y-3">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Career Advice for Students
              </h3>
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                isDarkMode ? "bg-amber-950/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
              }`}>
                <Quote className={`h-5 w-5 flex-shrink-0 transform rotate-180 ${
                  isDarkMode ? "text-amber-400" : "text-amber-500"
                }`} />
                <p className={`text-sm italic leading-relaxed ${isDarkMode ? "text-amber-200/90" : "text-amber-900"}`}>
                  {alumni.career_tips}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
