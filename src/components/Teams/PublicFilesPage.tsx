import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FileText, FileSpreadsheet, ImageIcon, Download, Globe, Search, Users, Eye, ArrowUpDown, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TeamFile } from '../../types/social';
import { listPublicFiles, formatFileSize, fileTypeLabel, PublicFilesSort } from '../../lib/api/filesApi';

type FileFilter = 'all' | 'pdf' | 'doc' | 'sheet' | 'image';

interface Props {
  isDarkMode: boolean;
  onViewTeam: (teamId: string) => void;
  onViewPreview: (fileUrl: string, fileName: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, '_blank', 'noreferrer');
  }
}

function FileIcon({ mime, size = 24 }: { mime: string; size?: number }) {
  if (mime.startsWith('image/')) return <ImageIcon size={size} className="text-[#1e9df1]" />;
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (mime === 'application/pdf') return <FileText size={size} className="text-red-500" />;
  return <FileText size={size} className="text-[#1e9df1]" />;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mimeMatchesFilter(mime: string, filter: FileFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pdf') return mime === 'application/pdf';
  if (filter === 'doc') return mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (filter === 'sheet') return mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (filter === 'image') return mime.startsWith('image/');
  return true;
}

const PAGE_SIZE = 40;

const SORT_OPTIONS: { key: PublicFilesSort; label: string }[] = [
  { key: 'recent', label: 'Recently Uploaded' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'name_desc', label: 'Name (Z–A)' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicFilesPage({ isDarkMode, onViewTeam, onViewPreview }: Props) {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FileFilter>('all');
  const [sort, setSort] = useState<PublicFilesSort>('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Debounce the search box so we don't re-query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function load(reset = false) {
    setLoading(true);
    const start = reset ? 0 : offset;
    const data = await listPublicFiles(PAGE_SIZE, start, { search, sort });
    if (reset) {
      setFiles(data);
      setOffset(data.length);
    } else {
      setFiles(prev => [...prev, ...data]);
      setOffset(prev => prev + data.length);
    }
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }

  // Re-fetch from the server (searches/sorts across ALL public files, not just
  // whatever page happened to be loaded already) whenever search or sort changes.
  useEffect(() => { load(true); }, [search, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = useMemo(() => {
    return files.filter(f => mimeMatchesFilter(f.file_type, filter));
  }, [files, filter]);

  const base = isDarkMode ? 'bg-[#000000] text-[#e7e9ea]' : 'bg-slate-50 text-slate-900';
  const card = `rounded-2xl border ${isDarkMode ? 'border-[#2f3336] bg-[#17181c]' : 'border-slate-200 bg-white'}`;
  const inputCls = `w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#1e9df1]/20 ${
    isDarkMode ? 'bg-[#17181c] border-[#2f3336] text-[#e7e9ea] placeholder-[#71767b]' : 'bg-white border-slate-200 text-slate-900 placeholder-[#71767b]'
  }`;

  const FILTERS: { key: FileFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pdf', label: 'PDF' },
    { key: 'doc', label: 'Doc' },
    { key: 'sheet', label: 'Sheet' },
    { key: 'image', label: 'Image' },
  ];

  return (
    <div className={`min-h-screen w-full pb-12 ${base}`}>
      {/* Page header */}
      <div className={`sticky top-0 z-10 px-4 sm:px-6 pt-5 pb-4 border-b ${isDarkMode ? 'bg-[#000000]/90 backdrop-blur-md border-[#2f3336]/80' : 'bg-slate-50/90 backdrop-blur-md border-slate-200'}`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 mb-1">
            <Globe size={18} className="text-[#1e9df1] flex-shrink-0" />
            <h1 className={`text-lg font-black ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-900'}`}>Shared Resources</h1>
          </div>
          <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
            Public files shared by teams across the platform
          </p>

          {/* Search + filter row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-600' : 'text-[#71767b]'}`} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search files by name…"
                className={inputCls}
              />
            </div>
            <div className={`flex items-center gap-1 p-0.5 rounded-xl ${isDarkMode ? 'bg-[#17181c] border border-[#2f3336]' : 'bg-white border border-slate-200'}`}>
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === key
                      ? 'bg-[#1e9df1] text-white shadow-sm'
                      : isDarkMode ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-[#71767b] hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortMenuOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all h-full ${
                  isDarkMode
                    ? 'bg-[#17181c] border-[#2f3336] text-[#8b98a5] hover:text-[#e7e9ea]'
                    : 'bg-white border-slate-200 text-[#71767b] hover:text-slate-800'
                }`}
              >
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.key === sort)?.label}</span>
              </button>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                  <div
                    className={`absolute right-0 mt-1.5 w-48 rounded-xl border shadow-xl z-20 overflow-hidden ${
                      isDarkMode ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'
                    }`}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSort(opt.key); setSortMenuOpen(false); }}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-left transition-colors ${
                          isDarkMode ? 'hover:bg-[#2f3336] text-[#e7e9ea]' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {opt.label}
                        {sort === opt.key && <Check size={14} className="text-[#1e9df1]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
        {loading && files.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-48 rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#17181c]' : 'bg-white border border-slate-200'}`} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-[#17181c]' : 'bg-slate-100'}`}>
              <Globe size={24} className={isDarkMode ? 'text-slate-500' : 'text-[#8b98a5]'} />
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
              {search || filter !== 'all' ? 'No files match your search' : 'No public files yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayed.map((file, idx) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.15), duration: 0.2 }}
                    className={`group flex flex-col gap-3 p-4 rounded-2xl border transition-shadow hover:shadow-md ${
                      isDarkMode ? 'border-[#2f3336] bg-[#17181c] hover:border-[#2f3336]' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Icon + type label */}
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-50'}`}>
                        <FileIcon mime={file.file_type} size={20} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-[#2f3336] text-slate-500' : 'border-slate-200 text-[#71767b]'}`}>
                        {fileTypeLabel(file.file_type)}
                      </span>
                    </div>

                    {/* File name + size */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold leading-tight line-clamp-2 ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-900'}`}>
                        {file.name}
                      </p>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
                        {formatFileSize(file.file_size)} · {relativeDate(file.created_at)}
                      </p>
                    </div>

                    {/* Team badge */}
                    {file.team && (
                      <button
                        onClick={() => onViewTeam(file.team!.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors w-full text-left ${
                          isDarkMode
                            ? 'border-[#2f3336] hover:border-[#2f3336] hover:bg-[#16181c]'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {file.team.logo_url ? (
                          <img src={file.team.logo_url} className="w-5 h-5 rounded-md object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`}>
                            <Users size={10} className={isDarkMode ? 'text-slate-500' : 'text-[#71767b]'} />
                          </div>
                        )}
                        <span className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-[#71767b]' : 'text-slate-600'}`}>
                          {file.team.name}
                        </span>
                      </button>
                    )}

                    {/* Uploader info row */}
                    <div className="flex items-center gap-2 mt-1">
                      {(file.uploader?.avatar_url || file.uploader?.profile_pic) ? (
                        <img src={(file.uploader.avatar_url || file.uploader.profile_pic)!} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`} />
                      )}
                      <span className={`text-[11.5px] font-medium ${isDarkMode ? 'text-[#71767b]' : 'text-slate-600'}`}>
                        Shared by: {file.uploader?.name ?? 'Unknown'}
                      </span>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => onViewPreview(file.file_url, file.name)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          isDarkMode
                            ? 'bg-[#16181c] hover:bg-[#2f3336] text-[#8b98a5] hover:text-[#e7e9ea] border-[#2f3336]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-900 border-slate-200'
                        }`}
                        title="Preview File"
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button
                        onClick={() => downloadFile(file.file_url, file.name)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          isDarkMode
                            ? 'bg-[#1e9df1] hover:bg-[#1677cc] text-white border-[#1e9df1] shadow-md shadow-[#1e9df1]/15'
                            : 'bg-[#1e9df1] hover:bg-[#1677cc] text-white border-[#1e9df1] shadow-sm shadow-[#1e9df1]/20'
                        }`}
                        title="Download"
                      >
                        <Download size={13} /> Download
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => load(false)}
                  disabled={loading}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-[#2f3336] text-[#71767b] hover:border-[#2f3336] hover:text-[#e7e9ea]'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
