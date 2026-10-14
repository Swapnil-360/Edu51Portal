import { GraduationCap, Briefcase, ArrowUpRight } from "lucide-react";
import { AlumniProfile } from "../../types/social";

interface Props {
  alumni: AlumniProfile;
  isDarkMode: boolean;
  onViewProfile: (id: string) => void;
}

export default function SuggestedMentorCard({ alumni, isDarkMode, onViewProfile }: Props) {
  // Generate a clean 2-letter monogram for the avatar
  const getInitials = (name?: string) => {
    if (!name) return "AL";
    const clean = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase() || "AL";
  };

  // Curated color gradient for the avatar
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-blue-600 via-indigo-600 to-sky-600",
      "from-indigo-600 via-purple-600 to-violet-600",
      "from-teal-600 via-emerald-600 to-cyan-600",
      "from-sky-600 via-blue-600 to-indigo-700",
      "from-violet-600 via-fuchsia-600 to-pink-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const titleColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const initials = getInitials(alumni.full_name);
  const avatarGradient = getAvatarGradient(alumni.full_name || "Alumni");

  return (
    <div
      className={`w-[285px] sm:w-[305px] h-full flex-shrink-0 snap-start rounded-2xl border p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-200 group ${
        isDarkMode
          ? "bg-gradient-to-b from-[#131722] to-[#0e1119] border-[#222a3d] hover:border-[#1e9df1]/60 hover:shadow-xl hover:shadow-[#1e9df1]/5"
          : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5"
      }`}
    >
      <div>
        {/* Top Profile Header */}
        <div className="flex items-start gap-3">
          {/* Avatar with Status Ring */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center font-bold text-white text-sm shadow-md bg-gradient-to-br ${avatarGradient}`}
              style={{ fontFamily: "'Exo 2', sans-serif" }}
            >
              {alumni.avatar_url ? (
                <img
                  src={alumni.avatar_url}
                  alt={alumni.full_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="tracking-wider">{initials}</span>
              )}
            </div>
            {/* Active Mentorship Indicator Dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ${
                isDarkMode ? "ring-[#0e1119]" : "ring-white"
              }`}
              title="Available for mentorship"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60"></span>
            </span>
          </div>

          {/* Name & Headline */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold truncate group-hover:text-[#1e9df1] transition-colors ${titleColor}`}>
              {alumni.full_name}
            </h4>

            {alumni.job_title ? (
              <p className={`text-xs truncate font-medium flex items-center gap-1 mt-0.5 ${isDarkMode ? "text-sky-400" : "text-blue-600"}`}>
                <Briefcase className="w-3 h-3 flex-shrink-0 opacity-70" />
                <span className="truncate">
                  {alumni.job_title}
                  {alumni.company_name ? ` · ${alumni.company_name}` : ""}
                </span>
              </p>
            ) : (
              <p className={`text-xs truncate italic mt-0.5 ${subColor}`}>
                BUBT Graduate
              </p>
            )}

            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <GraduationCap className="w-3 h-3 text-[#1e9df1] flex-shrink-0" />
              <span className="truncate">
                Class of {alumni.graduation_year} · <span className="font-semibold text-slate-300 uppercase">{alumni.major}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Skills or Bio */}
        <div className="mt-3.5">
          {alumni.skills && alumni.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {alumni.skills.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border capitalize ${
                    isDarkMode
                      ? "bg-[#1e9df1]/10 text-sky-300 border-[#1e9df1]/20"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {s}
                </span>
              ))}
              {alumni.skills.length > 3 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${subColor}`}>
                  +{alumni.skills.length - 3}
                </span>
              )}
            </div>
          ) : (
            <p className={`text-[11px] line-clamp-1 italic ${subColor}`}>
              Ready to advise on career & academic paths.
            </p>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div
        className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${
          isDarkMode ? "border-[#202738]" : "border-slate-100"
        }`}
      >
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Ready to Mentor
        </span>

        <button
          onClick={() => onViewProfile(alumni.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e9df1] hover:bg-[#1a8cd8] text-white transition-all shadow-sm shadow-[#1e9df1]/20 active:scale-95 cursor-pointer"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          <span>View Profile</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
