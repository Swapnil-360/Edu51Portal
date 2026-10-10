import React, { useState, useMemo } from "react";
import {
  Search,
  GraduationCap,
  Building2,
  Bell,
  X,
  HelpCircle,
} from "lucide-react";
import type {
  FacultyMember,
  ViceChancellor,
  AdministrativeOffice,
  UniversityNotice,
} from "../../types/faculty";
import { FacultyCard } from "./FacultyCard";
import { FacultyDetailModal } from "./FacultyDetailModal";
import { LeadershipCard } from "./LeadershipCard";
import { UniversityNoticesFeed } from "./UniversityNoticesFeed";

// Data
import facultyDataRaw from "../../data/universityFaculty.json";
import leadershipDataRaw from "../../data/leadershipData.json";
import noticesDataRaw from "../../data/recentNotices.json";

interface FacultyDirectoryPageProps {
  isDarkMode: boolean;
  onClose: () => void;
}

type Tab = "faculty" | "officials" | "notices";

const facultyList: FacultyMember[] = facultyDataRaw as FacultyMember[];
const leadershipData = leadershipDataRaw as {
  viceChancellor: ViceChancellor;
  administrativeOffices: AdministrativeOffice[];
};
const universityNotices: UniversityNotice[] = noticesDataRaw as UniversityNotice[];

// Department select options
const DEPARTMENT_OPTIONS = [
  { id: "all", name: "All Departments (472)", short: "All" },
  { id: "cse", name: "CSE - Computer Science & Engineering (145)", short: "CSE" },
  { id: "eee", name: "EEE - Electrical & Electronic Engineering (74)", short: "EEE" },
  { id: "civil", name: "Civil Engineering (37)", short: "Civil" },
  { id: "textile", name: "Textile Engineering (38)", short: "Textile" },
  { id: "math", name: "Mathematics & Statistics (22)", short: "Math & Stats" },
  { id: "ds", name: "Data Science & Engineering (8)", short: "Data Science" },
  { id: "law", name: "Law & Justice (18)", short: "Law" },
  { id: "english", name: "English (47)", short: "English" },
  { id: "management", name: "Management (23)", short: "Management" },
  { id: "accounting", name: "Accounting (14)", short: "Accounting" },
  { id: "finance", name: "Finance (11)", short: "Finance" },
  { id: "marketing", name: "Marketing (12)", short: "Marketing" },
  { id: "economics", name: "Economics (23)", short: "Economics" },
];

export const FacultyDirectoryPage: React.FC<FacultyDirectoryPageProps> = ({
  isDarkMode,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>("faculty");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedRank, setSelectedRank] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<FacultyMember | null>(null);
  const [noticesCount, setNoticesCount] = useState<number>(universityNotices.length);

  // Filter faculty members
  const filteredFaculty = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return facultyList.filter((m) => {
      // 1. Department filter
      if (selectedDept !== "all" && m.departmentId !== selectedDept) return false;

      // 2. Rank filter
      if (selectedRank !== "all") {
        const des = (m.primaryDesignation || "").toLowerCase();
        if (selectedRank === "professor" && !des.includes("professor")) return false;
        if (selectedRank === "assoc" && !des.includes("associate professor")) return false;
        if (selectedRank === "asst" && !des.includes("assistant professor")) return false;
        if (selectedRank === "lecturer" && !des.includes("lecturer")) return false;
        if (selectedRank === "chair" && !des.includes("chairman") && !des.includes("dean") && !des.includes("head"))
          return false;
      }

      // 3. Search query (matches name, routine code, designation, department, email)
      if (q !== "") {
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesCode = Boolean(m.code && m.code.toLowerCase().includes(q));
        const matchesDes = Boolean(m.primaryDesignation && m.primaryDesignation.toLowerCase().includes(q));
        const matchesDept = Boolean(m.departmentName && m.departmentName.toLowerCase().includes(q));
        const matchesEmail = Boolean(m.email && m.email.toLowerCase().includes(q));

        if (!matchesName && !matchesCode && !matchesDes && !matchesDept && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [selectedDept, selectedRank, searchQuery]);

  // Pill tab button matching NetworkPage style
  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-colors duration-150 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
        tab === t
          ? "bg-[#1e9df1] text-white font-bold shadow-md shadow-[#1e9df1]/20"
          : isDarkMode
          ? "font-medium text-[#71767b] hover:text-[#e7e9ea]"
          : "font-medium text-slate-500 hover:text-slate-800"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            tab === t ? "bg-white/20 text-white" : "bg-[#1e9df1] text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-100";
  const titleColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-[#71767b]" : "text-slate-500";
  const inputCls = `px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
  }`;

  return (
    <div className={`min-h-screen pb-16 transition-colors ${pageBg} ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${titleColor}`}>
              Info Hub
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${subColor}`}>
              BUBT university directory for faculty members, administrative offices, and official circulars
            </p>
          </div>

          <button
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors flex-shrink-0 ${
              isDarkMode
                ? "bg-[#16181c] border-[#2f3336] text-[#71767b] hover:text-white hover:bg-[#202327]"
                : "bg-white border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Pill Tab Row — exact NetworkPage style */}
        <div
          className={`inline-flex items-center rounded-full p-1.5 gap-0.5 border mb-5 ${
            isDarkMode
              ? "bg-[#16181c] border-[#2f3336] shadow-lg shadow-black/20"
              : "bg-white border-slate-300 shadow-md shadow-black/8"
          }`}
        >
          {tabBtn("faculty", "Faculty", 472)}
          {tabBtn("officials", "Officials", 11)}
          {tabBtn("notices", "Notices", noticesCount)}
        </div>

        {/* ── TAB 1: FACULTY DIRECTORY ── */}
        {tab === "faculty" && (
          <div className="space-y-4">
            {/* Search and Filters Bar (Dropdown based, no routine button, fully responsive) */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search by text / code */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71767b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by teacher name, routine code (e.g. TAB), or designation..."
                  className={`w-full pl-10 pr-9 ${inputCls}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#71767b] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department Scroll-Down Dropdown Filter */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className={`${inputCls} sm:w-64 cursor-pointer`}
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>

              {/* Academic Rank Dropdown Filter */}
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className={`${inputCls} sm:w-44 cursor-pointer`}
              >
                <option value="all">All Ranks</option>
                <option value="professor">Professors</option>
                <option value="assoc">Associate Professors</option>
                <option value="asst">Assistant Professors</option>
                <option value="lecturer">Lecturers</option>
                <option value="chair">Chairs & Deans</option>
              </select>

              {/* Reset Filter Button if active */}
              {(searchQuery || selectedDept !== "all" || selectedRank !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDept("all");
                    setSelectedRank("all");
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-500 hover:underline self-center whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Results Count Banner */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className={subColor}>
                Showing <strong className={titleColor}>{filteredFaculty.length}</strong> faculty members
                {selectedDept !== "all" && ` in ${DEPARTMENT_OPTIONS.find((d) => d.id === selectedDept)?.name.split(" (")[0]}`}
                {selectedRank !== "all" && ` (${selectedRank})`}
              </span>

              {searchQuery && (
                <span className="italic text-[#1e9df1]">
                  Matching: &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>

            {/* Faculty Cards Grid */}
            {filteredFaculty.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFaculty.map((member, idx) => (
                  <FacultyCard
                    key={`${member.id}-${idx}`}
                    member={member}
                    isDarkMode={isDarkMode}
                    onSelect={(m) => setSelectedMember(m)}
                    searchHighlight={searchQuery}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`text-center py-14 rounded-xl border ${
                  isDarkMode ? "bg-[#17181c] border-[#2f3336]/60 text-slate-400" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                <HelpCircle className="w-9 h-9 mx-auto mb-2.5 opacity-40 text-slate-400" />
                <h3 className={`text-base font-bold ${titleColor}`}>No faculty members found</h3>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  We couldn&apos;t find any faculty members matching your search and filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDept("all");
                    setSelectedRank("all");
                  }}
                  className="mt-3.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1e9df1] text-white hover:bg-[#1677cc] transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: OFFICIALS & LEADERSHIP ── */}
        {tab === "officials" && (
          <LeadershipCard
            viceChancellor={leadershipData.viceChancellor}
            administrativeOffices={leadershipData.administrativeOffices}
            isDarkMode={isDarkMode}
          />
        )}

        {/* ── TAB 3: NOTICES & CIRCULARS ── */}
        {tab === "notices" && (
          <UniversityNoticesFeed
            notices={universityNotices}
            isDarkMode={isDarkMode}
            onLiveNoticesUpdated={(list) => setNoticesCount(list.length)}
          />
        )}
      </div>

      {/* ── Faculty Detail Modal ── */}
      <FacultyDetailModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default FacultyDirectoryPage;
