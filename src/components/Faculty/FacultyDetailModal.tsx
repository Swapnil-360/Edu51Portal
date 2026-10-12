import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check,
  GraduationCap,
  Briefcase,
  BookOpen,
  Award,
  Building2,
  Calendar,
  Share2,
  MapPin,
  Heart,
} from "lucide-react";
import type { FacultyMember } from "../../types/faculty";

interface FacultyDetailModalProps {
  member: FacultyMember | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const FacultyDetailModal: React.FC<FacultyDetailModalProps> = ({
  member,
  isOpen,
  onClose,
  isDarkMode,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<"education" | "experience" | "publications" | "about">(
    "education"
  );

  useEffect(() => {
    setImgError(false);
  }, [member?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member || typeof document === "undefined") return null;

  const handleCopyEmail = () => {
    if (!member.email) return;
    navigator.clipboard.writeText(member.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyShareLink = () => {
    const shareUrl = member.profileUrl || window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getInitials = (name: string) => {
    const parts = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.substring(0, 2).toUpperCase() || "FC";
  };

  const hasEducation = Boolean(member.educations && member.educations.length > 0);
  const hasExperience = Boolean(member.experiences && member.experiences.length > 0);
  const hasPublications = Boolean(member.publications && member.publications.length > 0);
  const hasAbout = Boolean(member.summary);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto transition-all ${
          isDarkMode
            ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea]"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Banner Gradient Header */}
        <div className="relative h-28 sm:h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 flex-shrink-0">
          <div className="absolute inset-0 bg-black/15" />

          {/* Close & Share Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              onClick={handleCopyShareLink}
              title="Copy Profile Link"
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-5 sm:px-8 pb-4 relative -mt-12 sm:-mt-14 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {member.img && !imgError && !member.img.includes("shutterstock") ? (
                <img
                  src={member.img}
                  alt={member.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover object-top border-4 shadow-xl ${
                    isDarkMode ? "border-[#16181c] bg-slate-900" : "border-white bg-slate-100"
                  }`}
                />
              ) : (
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center font-bold text-2xl border-4 shadow-xl ${
                    isDarkMode
                      ? "bg-slate-800 text-white border-[#16181c]"
                      : "bg-slate-200 text-slate-700 border-white"
                  }`}
                >
                  {getInitials(member.name)}
                </div>
              )}

              {/* Routine short code badge */}
              {member.code && (
                <div
                  title="Routine Short Code"
                  className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-mono font-bold tracking-wider uppercase shadow-md border-2 border-white dark:border-[#16181c]"
                >
                  [{member.code}]
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {member.email && (
                <button
                  onClick={handleCopyEmail}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    copiedEmail
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : isDarkMode
                      ? "bg-[#2f3336] hover:bg-[#38444d] text-[#e7e9ea] border-[#38444d]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? "Copied" : "Copy Email"}</span>
                </button>
              )}

              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[#1e9df1] hover:bg-[#1a8cd8] text-white shadow-sm transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              )}

              {member.profileUrl && (
                <a
                  href={member.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-xl border transition-all ${
                    isDarkMode
                      ? "bg-[#2f3336] hover:bg-[#38444d] text-slate-300 border-[#38444d]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                  }`}
                  title="View on bubt.edu.bd"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Name & Academic Rank */}
          <div className="mt-3">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">{member.name}</h2>
            <p className="text-sm font-semibold text-[#1e9df1] mt-0.5">{member.primaryDesignation}</p>
            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {member.departmentName} • {member.facultyGroup}
            </p>
          </div>

          {/* Contact Details Grid */}
          <div
            className={`mt-4 p-3 sm:p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs ${
              isDarkMode ? "bg-[#1d2024]/80 border-[#2f3336]" : "bg-slate-50 border-slate-200"
            }`}
          >
            {member.email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-mono truncate select-all">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 truncate">
                <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{member.phone}</span>
              </div>
            )}
            {member.room && (
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="truncate">{member.room}</span>
              </div>
            )}
            {member.bloodGroup && (
              <div className="flex items-center gap-2 truncate">
                <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Blood Group: {member.bloodGroup}</span>
              </div>
            )}
            {member.code && (
              <div className="flex items-center gap-2 truncate">
                <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Routine Code: <span className="font-mono font-bold">[{member.code}]</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-5 sm:px-8 border-b flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar flex-shrink-0 ${
            isDarkMode ? "border-[#2f3336] bg-[#16181c]" : "border-slate-200 bg-white"
          }`}
        >
          <button
            onClick={() => setActiveTab("education")}
            className={`py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "education"
                ? "border-[#1e9df1] text-[#1e9df1]"
                : `border-transparent ${
                    isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-black"
                  }`
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Education ({member.educations?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("experience")}
            className={`py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "experience"
                ? "border-[#1e9df1] text-[#1e9df1]"
                : `border-transparent ${
                    isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-black"
                  }`
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Experience ({member.experiences?.length || 0})</span>
          </button>

          {hasPublications && (
            <button
              onClick={() => setActiveTab("publications")}
              className={`py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "publications"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : `border-transparent ${
                      isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-black"
                    }`
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Publications ({member.publications?.length || 0})</span>
            </button>
          )}

          {hasAbout && (
            <button
              onClick={() => setActiveTab("about")}
              className={`py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "about"
                  ? "border-[#1e9df1] text-[#1e9df1]"
                  : `border-transparent ${
                      isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-black"
                    }`
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Biography</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-4">
          {activeTab === "education" && (
            <div className="space-y-3">
              {hasEducation ? (
                member.educations!.map((edu, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                      isDarkMode ? "bg-[#1d2024]/60 border-[#2f3336]" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 mt-0.5 flex-shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm leading-snug">{edu.degree}</h4>
                      {edu.major && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          Major: <span className="font-medium">{edu.major}</span>
                        </p>
                      )}
                      {edu.institute && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {edu.institute}
                        </p>
                      )}
                      {edu.year && (
                        <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#2f3336] text-slate-700 dark:text-slate-300">
                          {edu.year}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className={`text-center py-8 px-4 rounded-2xl border border-dashed text-xs ${
                    isDarkMode ? "border-[#2f3336] bg-[#1d2024]/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <GraduationCap className="w-6 h-6 mx-auto mb-2 opacity-40 text-blue-500" />
                  <p className="font-semibold text-sm">No educational records published</p>
                  <p className="mt-1 max-w-sm mx-auto">
                    Detailed academic degrees have not been listed on the official BUBT portal for this member yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "experience" && (
            <div className="space-y-3">
              {hasExperience ? (
                member.experiences!.map((exp, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                      isDarkMode ? "bg-[#1d2024]/60 border-[#2f3336]" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5 flex-shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm leading-snug">{exp.position}</h4>
                      {exp.department && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          Department: {exp.department}
                        </p>
                      )}
                      {exp.institute && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {exp.institute}
                        </p>
                      )}
                      {exp.period && (
                        <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#2f3336] text-slate-700 dark:text-slate-300">
                          {exp.period}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className={`text-center py-8 px-4 rounded-2xl border border-dashed text-xs ${
                    isDarkMode ? "border-[#2f3336] bg-[#1d2024]/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <Briefcase className="w-6 h-6 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="font-semibold text-sm">No prior experience published</p>
                  <p className="mt-1 max-w-sm mx-auto">
                    Professional and academic work history is pending publication on the university portal.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "publications" && (
            <div className="space-y-3">
              {member.publications && member.publications.length > 0 ? (
                member.publications.map((pub, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      isDarkMode ? "bg-[#1d2024]/60 border-[#2f3336] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-bold text-[#1e9df1] mr-2">[{idx + 1}]</span>
                    {pub}
                  </div>
                ))
              ) : (
                <div className={`text-center py-8 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                  No publications recorded yet.
                </div>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div
              className={`p-4 rounded-xl border text-sm leading-relaxed ${
                isDarkMode ? "bg-[#1d2024]/60 border-[#2f3336] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {member.summary}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
