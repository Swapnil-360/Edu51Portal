import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  Search,
  FileText,
  ExternalLink,
  Calendar,
  X,
  RefreshCw,
} from "lucide-react";
import type { UniversityNotice } from "../../types/faculty";

interface UniversityNoticesFeedProps {
  notices: UniversityNotice[];
  isDarkMode: boolean;
  onLiveNoticesUpdated?: (notices: UniversityNotice[]) => void;
}

export const UniversityNoticesFeed: React.FC<UniversityNoticesFeedProps> = ({
  notices,
  isDarkMode,
  onLiveNoticesUpdated,
}) => {
  const [liveNotices, setLiveNotices] = useState<UniversityNotice[]>(notices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Cached");
  const [hasLiveLoaded, setHasLiveLoaded] = useState(false);

  const fetchLiveNotices = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/notices");
      if (res.ok) {
        const data = await res.json();
        if (data.notices && Array.isArray(data.notices) && data.notices.length > 0) {
          setLiveNotices(data.notices);
          setHasLiveLoaded(true);
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastSyncTime(nowStr);
          onLiveNoticesUpdated?.(data.notices);
        }
      }
    } catch {
      // Seamlessly keep bundled notices
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveNotices();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    liveNotices.forEach((n) => {
      if (n.category?.name) set.add(n.category.name);
    });
    return ["all", ...Array.from(set)];
  }, [liveNotices]);

  // Filter notices
  const filteredNotices = useMemo(() => {
    return liveNotices.filter((notice) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.category?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategory === "all" || notice.category?.name === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [liveNotices, searchQuery, selectedCategory]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadgeClass = (categoryName?: string) => {
    const name = categoryName?.toLowerCase() || "";
    if (name.includes("exam")) {
      return isDarkMode
        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
        : "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (name.includes("semester")) {
      return isDarkMode
        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
        : "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (name.includes("general")) {
      return isDarkMode
        ? "bg-blue-500/10 text-[#1e9df1] border-blue-500/30"
        : "bg-blue-50 text-blue-700 border-blue-200";
    }
    return isDarkMode
      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
      : "bg-purple-50 text-purple-700 border-purple-200";
  };

  const cardCls = `rounded-xl border transition-colors ${
    isDarkMode
      ? "bg-[#17181c] border-[#2f3336]/60 hover:border-[#38444d]"
      : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
  }`;

  const inputCls = `px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
  }`;

  return (
    <div className="space-y-4">
      {/* ── Search Bar & Category Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71767b]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars by keyword (e.g. Midterm, Registration, Holiday)..."
            className={`w-full pl-10 pr-9 ${inputCls}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#71767b] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills (matching NetworkPage filterBtn style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors duration-150 whitespace-nowrap border ${
                selectedCategory === cat
                  ? "bg-[#1e9df1]/15 text-[#1e9df1] border-[#1e9df1]/40 font-bold"
                  : isDarkMode
                  ? "bg-transparent border-[#2f3336] text-[#71767b] hover:text-[#e7e9ea] hover:border-[#71767b]"
                  : "bg-transparent border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400"
              }`}
            >
              {cat === "all" ? "All Circulars" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notices Results Count & Live Sync Bar ── */}
      <div className="flex items-center justify-between text-xs px-1 gap-2 flex-wrap">
        <span className={isDarkMode ? "text-[#71767b]" : "text-slate-500"}>
          Showing <strong className={isDarkMode ? "text-white" : "text-slate-900"}>{filteredNotices.length}</strong> official circulars
          {selectedCategory !== "all" && ` in ${selectedCategory}`}
        </span>

        {/* Live sync indicator & Refresh button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRefreshing ? "bg-amber-400" : "bg-emerald-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRefreshing ? "bg-amber-500" : "bg-emerald-500"}`}></span>
            </span>
            <span className={`font-medium ${isDarkMode ? "text-[#71767b]" : "text-slate-500"}`}>
              {isRefreshing ? "Syncing..." : hasLiveLoaded ? `Live • ${lastSyncTime}` : "Official Feed"}
            </span>
          </div>

          <button
            onClick={fetchLiveNotices}
            disabled={isRefreshing}
            title="Refresh circulars from BUBT portal"
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] font-semibold ${
              isDarkMode
                ? "border-[#2f3336] bg-[#16181c] text-[#71767b] hover:text-white hover:bg-[#202327] hover:border-[#38444d]"
                : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#1e9df1]" : ""}`} />
            <span>{isRefreshing ? "Checking..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Notices Grid ── */}
      {filteredNotices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredNotices.map((notice) => (
            <div key={notice.id} className={`${cardCls} p-4 sm:p-5 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                      notice.category?.name
                    )}`}
                  >
                    {notice.category?.name || "Official Notice"}
                  </span>

                  <div
                    className={`flex items-center gap-1 text-[11px] font-medium ${
                      isDarkMode ? "text-[#71767b]" : "text-slate-500"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(notice.created_at)}</span>
                  </div>
                </div>

                <h4
                  className={`font-semibold text-sm leading-snug line-clamp-3 mb-3 ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {notice.title}
                </h4>
              </div>

              {/* Action Button */}
              <div
                className={`pt-2.5 border-t flex items-center justify-between gap-3 ${
                  isDarkMode ? "border-[#2f3336]/60" : "border-slate-100"
                }`}
              >
                <span className={`text-[10px] ${isDarkMode ? "text-[#71767b]" : "text-slate-400"}`}>
                  Notice #{notice.id}
                </span>

                {notice.file ? (
                  <a
                    href={notice.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                ) : (
                  <span className={`text-[11px] italic ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Circular Text
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`text-center py-12 rounded-xl border ${
            isDarkMode ? "bg-[#17181c] border-[#2f3336]/60 text-slate-400" : "bg-white border-slate-200 text-slate-500"
          }`}
        >
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="font-semibold text-sm">No notices match your search.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="mt-2 text-xs font-semibold text-[#1e9df1] hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
