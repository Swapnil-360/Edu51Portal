import React, { useState, useEffect } from "react";
import { Mail, Phone, ExternalLink, Copy, Check, Award, BookOpen, User, Building2 } from "lucide-react";
import type { FacultyMember } from "../../types/faculty";

interface FacultyCardProps {
  member: FacultyMember;
  isDarkMode: boolean;
  onSelect: (member: FacultyMember) => void;
  searchHighlight?: string;
}

export const FacultyCard: React.FC<FacultyCardProps> = ({
  member,
  isDarkMode,
  onSelect,
  searchHighlight = "",
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [member.img]);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member.email) return;
    navigator.clipboard.writeText(member.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member.email) return;
    window.location.href = `mailto:${member.email}`;
  };

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.substring(0, 2).toUpperCase() || "FC";
  };

  // Department color accent
  const getDeptColor = (deptId: string) => {
    switch (deptId) {
      case "cse":
      case "ds":
        return {
          bg: isDarkMode ? "bg-cyan-950/40" : "bg-cyan-50",
          border: isDarkMode ? "border-cyan-800/40" : "border-cyan-200",
          text: isDarkMode ? "text-cyan-400" : "text-cyan-700",
          badgeBg: isDarkMode ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-800 border-cyan-200",
        };
      case "eee":
        return {
          bg: isDarkMode ? "bg-amber-950/40" : "bg-amber-50",
          border: isDarkMode ? "border-amber-800/40" : "border-amber-200",
          text: isDarkMode ? "text-amber-400" : "text-amber-700",
          badgeBg: isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-100 text-amber-800 border-amber-200",
        };
      case "civil":
        return {
          bg: isDarkMode ? "bg-emerald-950/40" : "bg-emerald-50",
          border: isDarkMode ? "border-emerald-800/40" : "border-emerald-200",
          text: isDarkMode ? "text-emerald-400" : "text-emerald-700",
          badgeBg: isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      case "textile":
        return {
          bg: isDarkMode ? "bg-purple-950/40" : "bg-purple-50",
          border: isDarkMode ? "border-purple-800/40" : "border-purple-200",
          text: isDarkMode ? "text-purple-400" : "text-purple-700",
          badgeBg: isDarkMode ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "math":
        return {
          bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-50",
          border: isDarkMode ? "border-blue-800/40" : "border-blue-200",
          text: isDarkMode ? "text-blue-400" : "text-blue-700",
          badgeBg: isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "law":
        return {
          bg: isDarkMode ? "bg-rose-950/40" : "bg-rose-50",
          border: isDarkMode ? "border-rose-800/40" : "border-rose-200",
          text: isDarkMode ? "text-rose-400" : "text-rose-700",
          badgeBg: isDarkMode ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-100 text-rose-800 border-rose-200",
        };
      case "english":
        return {
          bg: isDarkMode ? "bg-indigo-950/40" : "bg-indigo-50",
          border: isDarkMode ? "border-indigo-800/40" : "border-indigo-200",
          text: isDarkMode ? "text-indigo-400" : "text-indigo-700",
          badgeBg: isDarkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-100 text-indigo-800 border-indigo-200",
        };
      case "management":
      case "accounting":
      case "finance":
      case "marketing":
        return {
          bg: isDarkMode ? "bg-teal-950/40" : "bg-teal-50",
          border: isDarkMode ? "border-teal-800/40" : "border-teal-200",
          text: isDarkMode ? "text-teal-400" : "text-teal-700",
          badgeBg: isDarkMode ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-teal-100 text-teal-800 border-teal-200",
        };
      case "economics":
        return {
          bg: isDarkMode ? "bg-orange-950/40" : "bg-orange-50",
          border: isDarkMode ? "border-orange-800/40" : "border-orange-200",
          text: isDarkMode ? "text-orange-400" : "text-orange-700",
          badgeBg: isDarkMode ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-100 text-orange-800 border-orange-200",
        };
      default:
        return {
          bg: isDarkMode ? "bg-slate-900/40" : "bg-slate-50",
          border: isDarkMode ? "border-slate-800" : "border-slate-200",
          text: isDarkMode ? "text-slate-400" : "text-slate-600",
          badgeBg: isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const colors = getDeptColor(member.departmentId);
  const isCodeMatch =
    Boolean(searchHighlight) &&
    Boolean(member.code) &&
    member.code!.toLowerCase().includes(searchHighlight.toLowerCase());

  return (
    <div
      onClick={() => onSelect(member)}
      className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isDarkMode
          ? "bg-[#16181c] border-[#2f3336] hover:border-[#1e9df1]/60 hover:shadow-xl hover:shadow-[#1e9df1]/5"
          : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg shadow-sm"
      }`}
    >
      {/* Top Header Card Info */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          {/* Avatar Container */}
          <div className="relative flex-shrink-0">
            {member.img && !imgError && !member.img.includes("shutterstock") ? (
              <img
                src={member.img}
                alt={member.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover object-top border transition-transform duration-300 group-hover:scale-105 ${
                  isDarkMode ? "border-[#2f3336] bg-slate-900" : "border-slate-200 bg-slate-100"
                }`}
              />
            ) : (
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg border transition-transform duration-300 group-hover:scale-105 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-slate-800 to-slate-900 text-[#e7e9ea] border-[#2f3336]"
                    : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-slate-300"
                }`}
              >
                {getInitials(member.name)}
              </div>
            )}

            {/* Quick status indicator or verified badge */}
            {member.email && (
              <div
                title="Verified BUBT Faculty"
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#16181c] flex items-center justify-center shadow-sm"
              >
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            )}
          </div>

          {/* Name & Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              {/* Routine Code Badge (Critical for BUBT students reading class/exam routines) */}
              {member.code ? (
                <span
                  title="Teacher Routine Short Code (used in BUBT Routine & Exams)"
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase border transition-colors ${
                    isCodeMatch
                      ? "bg-yellow-400 text-black border-yellow-500 shadow-sm animate-pulse"
                      : isDarkMode
                      ? "bg-[#1e9df1]/15 text-[#1e9df1] border-[#1e9df1]/30 group-hover:bg-[#1e9df1]/25"
                      : "bg-blue-50 text-blue-700 border-blue-200 group-hover:bg-blue-100"
                  }`}
                >
                  [{member.code}]
                </span>
              ) : (
                <span
                  className={`text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded border ${colors.badgeBg}`}
                >
                  {member.departmentId.toUpperCase()}
                </span>
              )}

              {/* Department pill */}
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border truncate max-w-[140px] ${colors.badgeBg}`}
                title={member.departmentName}
              >
                {member.departmentId.toUpperCase()}
              </span>
            </div>

            <h3
              className={`font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#1e9df1] transition-colors ${
                isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"
              }`}
            >
              {member.name}
            </h3>

            <p
              className={`text-xs font-medium mt-0.5 line-clamp-1 ${
                isDarkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {member.primaryDesignation}
            </p>
          </div>
        </div>

        {/* Education Highlight (Highest Degree) */}
        {member.educations && member.educations.length > 0 && (
          <div
            className={`mt-3 pt-2.5 border-t text-[11px] flex items-center gap-1.5 line-clamp-1 ${
              isDarkMode ? "border-[#2f3336]/60 text-slate-400" : "border-slate-100 text-slate-500"
            }`}
          >
            <Award className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            <span className="truncate">
              {member.educations[0].degree}
              {member.educations[0].institute ? ` • ${member.educations[0].institute}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer / Contact Actions */}
      <div
        className={`px-4 py-2.5 border-t flex items-center justify-between gap-2 text-xs transition-colors ${
          isDarkMode
            ? "bg-[#191c20]/80 border-[#2f3336]"
            : "bg-slate-50/80 border-slate-100"
        }`}
      >
        {/* Email or Phone Info */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {member.email ? (
            <button
              onClick={handleEmailClick}
              title={`Send Email to ${member.email}`}
              className={`flex items-center gap-1 truncate font-mono text-[11px] hover:underline underline-offset-2 ${
                isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-blue-600"
              }`}
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
              <span className="truncate">{member.email}</span>
            </button>
          ) : (
            <span className={`text-[11px] font-medium flex items-center gap-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span className="truncate">{member.departmentName}</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {member.email && (
            <button
              onClick={handleCopyEmail}
              title={copiedEmail ? "Copied!" : "Copy Email"}
              className={`p-1.5 rounded-lg border transition-all ${
                copiedEmail
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : isDarkMode
                  ? "hover:bg-[#2f3336] text-slate-400 hover:text-white border-transparent hover:border-[#38444d]"
                  : "hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-transparent hover:border-slate-300"
              }`}
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={() => onSelect(member)}
            title="View Full Profile"
            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all ${
              isDarkMode
                ? "bg-[#2f3336] text-[#e7e9ea] hover:bg-[#1e9df1] hover:text-white"
                : "bg-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white"
            }`}
          >
            <span>Details</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
