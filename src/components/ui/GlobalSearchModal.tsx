import { useEffect, useRef, useState } from "react";
import { Search, X, FileText, Megaphone, User as UserIcon } from "lucide-react";
import { globalSearch, GlobalSearchResults } from "../../lib/api/globalSearchApi";
import ChipLoader from "./ChipLoader";

interface Props {
  isDarkMode: boolean;
  onClose: () => void;
  onOpenMaterial: (fileUrl: string, title: string) => void;
  onOpenNotices: () => void;
  onOpenProfile: (username: string) => void;
}

const EMPTY: GlobalSearchResults = { materials: [], notices: [], people: [] };

export default function GlobalSearchModal({ isDarkMode, onClose, onOpenMaterial, onOpenNotices, onOpenProfile }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Lock body scroll while open — see OnboardingTour.tsx for why plain
  // overflow:hidden isn't enough on mobile.
  useEffect(() => {
    const y = window.scrollY, x = window.scrollX;
    const prev = { overflow: document.body.style.overflow, position: document.body.style.position, top: document.body.style.top, left: document.body.style.left, right: document.body.style.right };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      Object.assign(document.body.style, prev);
      window.scrollTo({ top: y, left: x, behavior: "instant" });
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = window.setTimeout(() => {
      globalSearch(trimmed).then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const hasResults = results.materials.length || results.notices.length || results.people.length;
  const trimmed = query.trim();

  const sectionTitle = (label: string) => (
    <p className={`text-[10px] font-bold uppercase tracking-wider px-1 mb-1.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
      {label}
    </p>
  );

  const rowCls = `w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
    isDarkMode ? "hover:bg-[#1c1f23]" : "hover:bg-slate-100"
  }`;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden ${
          isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-white border-slate-200"
        }`}
      >
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search materials, notices, people..."
            className={`flex-1 bg-transparent outline-none text-sm ${isDarkMode ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"}`}
          />
          <button onClick={onClose} className={`p-1 rounded-md ${isDarkMode ? "text-slate-500 hover:text-white hover:bg-[#2f3336]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {trimmed.length < 2 ? (
            <p className={`text-xs text-center py-10 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              Type at least 2 characters to search.
            </p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <ChipLoader size="sm" />
            </div>
          ) : !hasResults ? (
            <p className={`text-xs text-center py-10 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              No results for "{trimmed}".
            </p>
          ) : (
            <div className="space-y-4">
              {results.materials.length > 0 && (
                <div>
                  {sectionTitle("Materials")}
                  {results.materials.map((m) => (
                    <button key={m.id} onClick={() => { onOpenMaterial(m.file_url, m.title); onClose(); }} className={rowCls}>
                      <FileText className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{m.title}</p>
                        {m.description && (
                          <p className={`text-xs truncate ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{m.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.notices.length > 0 && (
                <div>
                  {sectionTitle("Notices")}
                  {results.notices.map((n) => (
                    <button key={n.id} onClick={() => { onOpenNotices(); onClose(); }} className={rowCls}>
                      <Megaphone className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{n.title}</p>
                        <p className={`text-xs capitalize ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{n.category.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.people.length > 0 && (
                <div>
                  {sectionTitle("People")}
                  {results.people.map((p) => (
                    <button key={p.id} onClick={() => { if (p.username) onOpenProfile(p.username); onClose(); }} className={rowCls}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-[#2f3336]" : "bg-slate-200"}`}>
                          <UserIcon className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>{p.name}</p>
                        {p.headline && (
                          <p className={`text-xs truncate ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{p.headline}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
