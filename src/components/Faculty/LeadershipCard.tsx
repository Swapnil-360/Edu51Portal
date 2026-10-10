import React, { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import type { ViceChancellor, AdministrativeOffice } from "../../types/faculty";

interface LeadershipCardProps {
  viceChancellor: ViceChancellor;
  administrativeOffices: AdministrativeOffice[];
  isDarkMode: boolean;
}

export const LeadershipCard: React.FC<LeadershipCardProps> = ({
  viceChancellor,
  administrativeOffices,
  isDarkMode,
}) => {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(viceChancellor.avatar || "/images/vc-shawkat-ali.jpg");
  const [vcImgError, setVcImgError] = useState(false);

  const REMOTE_FALLBACK =
    "https://www.bubt.edu.bd/storage/office_staff_image/prof-dr-a-b-m-shawkat-ali_24160012003_2c55c2f7-bb43-404e-b263-62ffb37cd0ca.jpg";

  const handleImgError = () => {
    if (imgSrc !== REMOTE_FALLBACK) {
      setImgSrc(REMOTE_FALLBACK);
    } else {
      setVcImgError(true);
    }
  };

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const cardCls = `rounded-xl border transition-colors ${
    isDarkMode
      ? "bg-[#17181c] border-[#2f3336]/60 hover:border-[#38444d]"
      : "bg-white border-slate-200 hover:border-slate-300"
  }`;

  return (
    <div className="space-y-6">
      {/* ── Featured Vice-Chancellor Card ── */}
      <div className={`p-5 sm:p-6 rounded-xl border ${
        isDarkMode ? "bg-[#17181c] border-[#2f3336]/70" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0 mx-auto sm:mx-0">
            {!vcImgError ? (
              <img
                src={imgSrc}
                alt={viceChancellor.name}
                onError={handleImgError}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover object-top border ${
                  isDarkMode ? "border-[#2f3336] bg-slate-900" : "border-slate-200 bg-slate-100"
                }`}
              />
            ) : (
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl border flex flex-col items-center justify-center font-bold select-none ${
                  isDarkMode
                    ? "bg-[#1f2328] border-[#2f3336] text-[#1e9df1]"
                    : "bg-blue-50 border-blue-200 text-[#1e9df1]"
                }`}
              >
                <span className="text-2xl font-black">SA</span>
                <span className="text-[10px] tracking-widest uppercase opacity-80 font-semibold mt-1">
                  Prof. Ali
                </span>
              </div>
            )}
            <span
              className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-md bg-[#1e9df1] text-white text-[10px] font-bold uppercase tracking-wider shadow"
            >
              VC
            </span>
          </div>

          {/* VC Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className={`text-lg sm:text-xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {viceChancellor.name}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#1e9df1] mt-0.5">
                  {viceChancellor.title} • {viceChancellor.university}
                </p>
                <p className={`text-xs mt-0.5 ${isDarkMode ? "text-[#71767b]" : "text-slate-500"}`}>
                  {viceChancellor.academicRole}
                </p>
              </div>

              {viceChancellor.profileUrl && (
                <a
                  href={viceChancellor.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-center sm:self-start"
                >
                  <span>Official Desk</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Quote message */}
            <blockquote
              className={`mt-3 p-3 rounded-lg text-xs italic leading-relaxed border ${
                isDarkMode
                  ? "bg-[#111317] border-[#2f3336]/60 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              &ldquo;{viceChancellor.message}&rdquo;
            </blockquote>

            {/* Contact details row */}
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  isDarkMode ? "bg-[#111317] border-[#2f3336]/60" : "bg-slate-50 border-slate-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="font-mono text-[11px]">{viceChancellor.email}</span>
                <button
                  onClick={() => handleCopy(viceChancellor.email)}
                  title="Copy Email"
                  className="ml-1 p-0.5 hover:text-[#1e9df1] transition-colors"
                >
                  {copiedEmail === viceChancellor.email ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>

              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  isDarkMode ? "bg-[#111317] border-[#2f3336]/60" : "bg-slate-50 border-slate-200"
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-[11px]">{viceChancellor.phone}</span>
              </div>

              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border max-w-full ${
                  isDarkMode ? "bg-[#111317] border-[#2f3336]/60" : "bg-slate-50 border-slate-200"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span className="text-[11px] truncate">{viceChancellor.office}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Administrative Offices Section ── */}
      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Administrative Offices & Student Desks ({administrativeOffices.length})
          </h3>
          <span className={`text-xs ${isDarkMode ? "text-[#71767b]" : "text-slate-500"}`}>
            Official contacts for student affairs & administration
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {administrativeOffices.map((office, idx) => (
            <div key={idx} className={`${cardCls} p-4 flex flex-col justify-between`}>
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className={`font-semibold text-sm leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {office.name}
                  </h4>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border flex-shrink-0 ${
                      isDarkMode
                        ? "bg-[#111317] text-slate-300 border-[#2f3336]"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {office.designation}
                  </span>
                </div>

                <p className={`text-xs leading-relaxed mb-3 ${isDarkMode ? "text-[#71767b]" : "text-slate-600"}`}>
                  {office.description}
                </p>
              </div>

              {/* Office Contact Info */}
              <div
                className={`pt-2.5 border-t space-y-1.5 text-xs ${
                  isDarkMode ? "border-[#2f3336]/60" : "border-slate-100"
                }`}
              >
                {office.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                    <span className={`truncate text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      {office.location}
                    </span>
                  </div>
                )}

                {office.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="truncate font-mono text-[11px]">{office.phone}</span>
                  </div>
                )}

                {office.email && (
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`mailto:${office.email}`}
                      className="flex items-center gap-1.5 font-mono text-[11px] truncate text-[#1e9df1] hover:underline"
                    >
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{office.email}</span>
                    </a>
                    <button
                      onClick={() => handleCopy(office.email)}
                      title="Copy Email"
                      className="p-1 hover:text-[#1e9df1] transition-colors flex-shrink-0"
                    >
                      {copiedEmail === office.email ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
