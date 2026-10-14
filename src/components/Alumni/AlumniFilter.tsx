import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Building2,
  Calendar,
  RotateCcw,
} from "lucide-react";
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
  onReset?: () => void;
}

const DEPARTMENTS = [
  { value: "All", label: "All Departments" },
  { value: "CSE", label: "CSE (Computer Science & Eng.)" },
  { value: "EEE", label: "EEE (Electrical & Electronics)" },
  { value: "Civil", label: "Civil Engineering" },
  { value: "Textile", label: "Textile Engineering" },
  { value: "BBA", label: "BBA (Business Admin)" },
  { value: "English", label: "English Department" },
  { value: "Law", label: "Law & Justice" },
  { value: "Economics", label: "Economics" },
  { value: "Mathematics", label: "Mathematics & Statistics" },
  { value: "Other", label: "Other Departments" },
];

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
  onReset,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 16 }, (_, i) => currentYear - i);

  // Advanced filters count (excluding search & major which are in the main bar)
  const advancedFilterCount =
    (graduationYear ? 1 : 0) +
    (company.trim() ? 1 : 0) +
    selectedSkills.length +
    (mentorshipOnly ? 1 : 0);

  // Any active filter check for reset functionality
  const hasActiveFilters =
    search.trim() !== "" ||
    major !== "All" ||
    mentorshipOnly ||
    graduationYear !== null ||
    company.trim() !== "" ||
    selectedSkills.length > 0;

  const handleClearAll = () => {
    setSearch("");
    setMajor("All");
    setMentorshipOnly(false);
    setGraduationYear(null);
    setCompany("");
    setSelectedSkills([]);
    if (onReset) onReset();
  };

  const removeSkill = (skillToRemove: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skillToRemove));
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isDarkMode
          ? "bg-[#12161f]/95 border-[#202738] shadow-lg shadow-black/20"
          : "bg-white border-slate-200 shadow-sm"
      }`}
    >
      {/* Primary Toolbar */}
      <div className="p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-slate-400"}`} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alumni by name, role, company..."
            className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all duration-150 ${
              isDarkMode
                ? "bg-[#0c1017] border-[#222b3d] text-white placeholder-slate-500 focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]/30"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1] focus:bg-white focus:ring-1 focus:ring-[#1e9df1]/30"
            }`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Department Filter Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-[160px] sm:min-w-[190px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GraduationCap
                className={`h-4 w-4 transition-colors ${
                  major !== "All"
                    ? "text-[#1e9df1]"
                    : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              />
            </div>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              aria-label="Filter by department"
              className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm font-medium border appearance-none cursor-pointer outline-none transition-all duration-150 ${
                major !== "All"
                  ? isDarkMode
                    ? "bg-[#1e9df1]/10 border-[#1e9df1] text-[#1e9df1]"
                    : "bg-blue-50 border-[#1e9df1] text-blue-700 font-semibold"
                  : isDarkMode
                  ? "bg-[#0c1017] border-[#222b3d] text-slate-200 hover:border-slate-600 focus:border-[#1e9df1]"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 focus:border-[#1e9df1]"
              }`}
            >
              {DEPARTMENTS.map((dept) => (
                <option
                  key={dept.value}
                  value={dept.value}
                  className={isDarkMode ? "bg-[#12161f] text-white" : "bg-white text-slate-900"}
                >
                  {dept.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <ChevronDown
                className={`h-4 w-4 ${
                  major !== "All"
                    ? "text-[#1e9df1]"
                    : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-400"
                }`}
              />
            </div>
          </div>

          {/* Quick Mentorship Toggle Button */}
          <button
            type="button"
            onClick={() => setMentorshipOnly(!mentorshipOnly)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 flex-shrink-0 cursor-pointer ${
              mentorshipOnly
                ? isDarkMode
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-950/40"
                  : "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
                : isDarkMode
                ? "bg-[#0c1017] border-[#222b3d] text-slate-400 hover:text-slate-200 hover:border-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300"
            }`}
            title="Toggle graduates open to mentor students"
          >
            <Sparkles className={`h-3.5 w-3.5 ${mentorshipOnly ? "text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">Mentors Only</span>
            <span className="sm:hidden">Mentors</span>
          </button>

          {/* Advanced Filters Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 flex-shrink-0 cursor-pointer ${
              showAdvanced || advancedFilterCount > 0
                ? "bg-[#1e9df1] border-[#1e9df1] text-white shadow-sm shadow-[#1e9df1]/25"
                : isDarkMode
                ? "bg-[#0c1017] border-[#222b3d] text-slate-300 hover:text-white hover:border-slate-600"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {advancedFilterCount > 0 && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-white/25 text-white">
                {advancedFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Reset All Filters Button (visible when any active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className={`p-2.5 rounded-xl border transition-all duration-150 flex-shrink-0 cursor-pointer ${
                isDarkMode
                  ? "bg-[#0c1017] border-[#222b3d] text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300"
              }`}
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips Summary */}
      {hasActiveFilters && (
        <div
          className={`px-3 sm:px-4 py-2 border-t flex items-center gap-1.5 flex-wrap text-xs ${
            isDarkMode ? "border-[#202738] bg-[#0c1017]/50" : "border-slate-100 bg-slate-50/70"
          }`}
        >
          <span className={`text-[11px] font-medium mr-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            Active filters:
          </span>

          {search.trim() && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-xs"
              }`}
            >
              <Search className="w-3 h-3 text-slate-400" />
              <span>"{search}"</span>
              <button
                onClick={() => setSearch("")}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {major !== "All" && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-[#1e9df1]/10 border-[#1e9df1]/30 text-[#1e9df1]"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              <span>Dept: {major}</span>
              <button
                onClick={() => setMajor("All")}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {mentorshipOnly && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Mentors Only</span>
              <button
                onClick={() => setMentorshipOnly(false)}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {graduationYear !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                  : "bg-purple-50 border-purple-200 text-purple-700"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Class of {graduationYear}</span>
              <button
                onClick={() => setGraduationYear(null)}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {company.trim() && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Company: {company}</span>
              <button
                onClick={() => setCompany("")}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedSkills.map((sk) => (
            <span
              key={sk}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                isDarkMode
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700"
              }`}
            >
              <span>{sk}</span>
              <button
                onClick={() => removeSkill(sk)}
                className="hover:text-rose-400 ml-0.5 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            onClick={handleClearAll}
            className={`text-[11px] font-semibold underline underline-offset-2 ml-auto cursor-pointer ${
              isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Advanced Filters Expandable Drawer */}
      {showAdvanced && (
        <div
          className={`p-4 border-t flex flex-col gap-4 animate-in fade-in duration-200 ${
            isDarkMode ? "border-[#202738] bg-[#0c1017]/30" : "border-slate-200 bg-slate-50/40"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Graduation Year */}
            <div>
              <label
                className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#1e9df1]" />
                Graduation Year
              </label>
              <select
                value={graduationYear ?? ""}
                onChange={(e) =>
                  setGraduationYear(e.target.value ? Number(e.target.value) : null)
                }
                className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all duration-150 ${
                  isDarkMode
                    ? "bg-[#0c1017] border-[#222b3d] text-white focus:border-[#1e9df1]"
                    : "bg-white border-slate-200 text-slate-900 focus:border-[#1e9df1]"
                }`}
              >
                <option value="">Any Graduation Year</option>
                {graduationYears.map((y) => (
                  <option key={y} value={y}>
                    Class of {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div>
              <label
                className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-[#1e9df1]" />
                Company / Organization
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Filter by company (e.g. Google, Pathao)..."
                className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-all duration-150 ${
                  isDarkMode
                    ? "bg-[#0c1017] border-[#222b3d] text-white placeholder-slate-500 focus:border-[#1e9df1]"
                    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
                }`}
              />
            </div>
          </div>

          {/* Filter by Skill */}
          <div>
            <span
              className={`text-xs font-semibold block mb-1.5 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Filter by Skills
            </span>
            <SkillsEditor
              items={selectedSkills}
              onChange={setSelectedSkills}
              placeholder="Type a skill and press Enter..."
              isDarkMode={isDarkMode}
              badgeColor="purple"
              suggestions={CSE_SKILL_SUGGESTIONS}
            />
          </div>

          {/* Mentorship Toggle in Drawer */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl border ${
              isDarkMode ? "bg-[#12161f] border-[#202738]" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-col">
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Available for Mentorship Only
              </span>
              <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Show only verified alumni actively open to guide and mentor BUBT students
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
              <input
                type="checkbox"
                checked={mentorshipOnly}
                onChange={(e) => setMentorshipOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-10 h-5 rounded-full transition-colors ${
                  isDarkMode ? "bg-slate-800" : "bg-slate-200"
                } peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5`}
              ></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
