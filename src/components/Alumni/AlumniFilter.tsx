import { useState } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import SkillsEditor, { CSE_SKILL_SUGGESTIONS } from "../Profile/SkillsEditor";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  major: string;
  setMajor: (v: string) => void;
  mentorshipOnly: boolean;
  setMentorshipOnly: (v: boolean) => void;
  graduationYear: number | null;
  setGraduationYear: (v: number | null) => void;
  company: string;
  setCompany: (v: string) => void;
  selectedSkills: string[];
  setSelectedSkills: (v: string[]) => void;
  isDarkMode: boolean;
}

export default function AlumniFilter({
  search,
  setSearch,
  major,
  setMajor,
  mentorshipOnly,
  setMentorshipOnly,
  graduationYear,
  setGraduationYear,
  company,
  setCompany,
  selectedSkills,
  setSelectedSkills,
  isDarkMode,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const inputBg = isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-300";
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const placeholderColor = isDarkMode ? "placeholder-[#71767b]" : "placeholder-slate-400";
  const focusBorder = "focus:border-[#1e9df1]";

  const majors = ["All", "CSE", "EEE", "BBA", "Textile", "Civil", "Other"];
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 16 }, (_, i) => currentYear - i);

  const advancedFilterCount =
    (graduationYear ? 1 : 0) + (company.trim() ? 1 : 0) + selectedSkills.length + (mentorshipOnly ? 1 : 0);

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
        isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-3">
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
            className={`w-full pl-9 pr-9 py-2.5 rounded-lg text-sm border outline-none transition-all duration-150 ${inputBg} ${textColor} ${placeholderColor} ${focusBorder}`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-400 hover:text-slate-700"}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150 flex-shrink-0 ${
            showAdvanced || advancedFilterCount > 0
              ? "bg-[#1e9df1] border-[#1e9df1] text-white"
              : isDarkMode
              ? "bg-[#16181c] border-[#2f3336] text-[#8b98a5] hover:text-[#e7e9ea] hover:bg-[#202327]"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {advancedFilterCount > 0 && (
            <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-white/20">
              {advancedFilterCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Major Filter — horizontally scrollable pill row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {majors.map((m) => {
          const isActive = major === m;
          return (
            <button
              key={m}
              onClick={() => setMajor(m)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex-shrink-0 ${
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

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="flex flex-col gap-4 border-t border-[#2f3336]/10 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={graduationYear ?? ""}
              onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : null)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm border outline-none transition-all duration-150 ${inputBg} ${textColor} ${focusBorder}`}
            >
              <option value="">Any Graduation Year</option>
              {graduationYears.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Filter by company..."
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm border outline-none transition-all duration-150 ${inputBg} ${textColor} ${placeholderColor} ${focusBorder}`}
            />
          </div>

          <div>
            <span className={`text-xs font-semibold block mb-2 ${textColor}`}>Filter by Skill</span>
            <SkillsEditor
              items={selectedSkills}
              onChange={setSelectedSkills}
              placeholder="Type a skill and press Enter..."
              isDarkMode={isDarkMode}
              badgeColor="purple"
              suggestions={CSE_SKILL_SUGGESTIONS}
            />
          </div>

          <div className="flex items-center justify-between">
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
      )}
    </div>
  );
}
