import { useState } from "react";
import { ArrowLeft, GraduationCap, PlusCircle, SearchX } from "lucide-react";
import { useAlumni } from "../../hooks/useAlumni";
import AlumniFilter from "./AlumniFilter";
import AlumniCard from "./AlumniCard";

interface Props {
  isDarkMode: boolean;
  isLoggedIn: boolean;
  onViewProfile: (id: string) => void;
  onRegisterClick: () => void;
  onClose: () => void;
}

export default function AlumniDirectoryPage({
  isDarkMode,
  isLoggedIn,
  onViewProfile,
  onRegisterClick,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [major, setMajor] = useState("All");
  const [mentorshipOnly, setMentorshipOnly] = useState(false);

  // Fetch verified alumni
  const { alumni, loading, error } = useAlumni({
    major,
    search,
    mentorshipOnly,
  });

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-50";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBorder = isDarkMode ? "border-[#2f3336]/50 bg-[#17181c]" : "border-slate-200 bg-white";

  return (
    <div className={`min-h-screen pb-12 ${pageBg}`}>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-slate-200/50 ${isDarkMode ? "hover:bg-[#16181c] text-white" : "text-slate-900"}`}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
                <GraduationCap className="h-6 w-6 text-[#1e9df1]" />
                Alumni Hub
              </h1>
              <p className={`text-xs ${subColor}`}>Connect with BUBT alumni and find mentorship</p>
            </div>
          </div>

          <button
            onClick={onRegisterClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-semibold shadow-md shadow-[#1e9df1]/10 transition-all duration-150"
          >
            <PlusCircle className="h-4 w-4" />
            Register as Alumni
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AlumniFilter
            search={search}
            setSearch={setSearch}
            major={major}
            setMajor={setMajor}
            mentorshipOnly={mentorshipOnly}
            setMentorshipOnly={setMentorshipOnly}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Main Grid / Loading / Empty State */}
        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 flex flex-col gap-4 animate-pulse ${cardBorder}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-slate-300 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-300 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-1/3 bg-slate-300 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="pt-3 border-t border-[#2f3336]/10 flex items-center justify-between">
                  <div className="h-4 w-24 bg-slate-300 dark:bg-slate-800 rounded" />
                  <div className="h-8 w-20 bg-slate-300 dark:bg-slate-800 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : alumni.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
              <SearchX size={28} className={isDarkMode ? "text-slate-500" : "text-[#8b98a5]"} />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${textColor}`}>No alumni found</h3>
              <p className={`text-xs max-w-xs mt-1 ${subColor}`}>
                We couldn't find any profiles matching your criteria. Try adjusting your search filters or be the first to register!
              </p>
            </div>
          </div>
        ) : (
          /* Alumni Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {alumni.map((a) => (
              <AlumniCard
                key={a.id}
                alumni={a}
                isDarkMode={isDarkMode}
                onViewProfile={onViewProfile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
