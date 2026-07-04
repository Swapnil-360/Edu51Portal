import { Search } from "lucide-react";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  major: string;
  setMajor: (v: string) => void;
  mentorshipOnly: boolean;
  setMentorshipOnly: (v: boolean) => void;
  isDarkMode: boolean;
}

export default function AlumniFilter({
  search,
  setSearch,
  major,
  setMajor,
  mentorshipOnly,
  setMentorshipOnly,
  isDarkMode,
}: Props) {
  const inputBg = isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-300";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const placeholderColor = isDarkMode ? "placeholder-[#71767b]" : "placeholder-slate-400";
  const focusBorder = "focus:border-[#1e9df1]";

  const majors = ["All", "CSE", "EEE", "BBA", "Other"];

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-4 transition-colors ${
        isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alumni by name, role, company..."
            className={`w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border outline-none transition-all duration-150 ${inputBg} ${textColor} ${placeholderColor} ${focusBorder}`}
          />
        </div>

        {/* Major Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {majors.map((m) => {
            const isActive = major === m;
            return (
              <button
                key={m}
                onClick={() => setMajor(m)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#1e9df1] text-white shadow-md shadow-[#1e9df1]/20"
                    : isDarkMode
                    ? "bg-[#16181c] border border-[#2f3336] text-[#71767b] hover:text-[#e7e9ea] hover:bg-[#202327]"
                    : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mentorship Toggle */}
      <div className="flex items-center justify-between border-t border-[#2f3336]/10 pt-3">
        <div className="flex flex-col">
          <span className={`text-xs font-semibold ${textColor}`}>Available for Mentorship</span>
          <span className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Show only graduates available to guide students
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={mentorshipOnly}
            onChange={(e) => setMentorshipOnly(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className={`w-9 h-5 rounded-full transition-colors ${
              isDarkMode ? "bg-slate-800" : "bg-slate-200"
            } peer-checked:bg-[#1e9df1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full`}
          ></div>
        </label>
      </div>
    </div>
  );
}
