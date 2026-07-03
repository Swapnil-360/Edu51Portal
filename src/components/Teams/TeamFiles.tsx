import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  FileText, FileSpreadsheet, ImageIcon, Upload, Trash2,
  Download, Globe, Lock, X, Paperclip, Eye, ArrowUpDown,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { TeamFile } from '../../types/social';
import {
  listTeamFiles, uploadTeamFile, deleteTeamFile,
  setFileVisibility, formatFileSize, ACCEPTED_MIME,
} from '../../lib/api/filesApi';

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

interface Props {
  teamId: string;
  currentUserId: string;
  isMember: boolean;
  canManage: boolean;
  isDarkMode: boolean;
  onCountChange?: (count: number) => void;
  onViewPreview?: (url: string, name: string) => void;
}

type SortBy = 'newest' | 'oldest' | 'type';
type TypeFilter = 'all' | 'pdf' | 'doc' | 'sheet' | 'image';

interface QueueItem {
  id: string;
  name: string;
  pct: number;
  status: 'uploading' | 'done' | 'error';
}

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'error';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FileIcon({ mime, size = 28 }: { mime: string; size?: number }) {
  if (mime.startsWith('image/')) return <ImageIcon size={size} className="text-blue-500" />;
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (mime === 'application/pdf') return <FileText size={size} className="text-red-500" />;
  return <FileText size={size} className="text-indigo-500" />;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function mimeMatchesFilter(mime: string, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pdf') return mime === 'application/pdf';
  if (filter === 'doc') return mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (filter === 'sheet') return mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (filter === 'image') return mime.startsWith('image/');
  return true;
}

function isPreviewable(mime: string, name?: string): boolean {
  const m = mime.toLowerCase();
  const n = name?.toLowerCase() || '';
  return (
    m === 'application/pdf' ||
    m.startsWith('image/') ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    m === 'application/msword' ||
    m === 'application/vnd.ms-excel' ||
    m === 'application/vnd.ms-powerpoint' ||
    n.endsWith('.pdf') ||
    n.endsWith('.png') ||
    n.endsWith('.jpg') ||
    n.endsWith('.jpeg') ||
    n.endsWith('.webp') ||
    n.endsWith('.svg') ||
    n.endsWith('.gif') ||
    n.endsWith('.doc') ||
    n.endsWith('.docx') ||
    n.endsWith('.xls') ||
    n.endsWith('.xlsx') ||
    n.endsWith('.ppt') ||
    n.endsWith('.pptx')
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamFiles({ teamId, currentUserId, isMember, canManage, isDarkMode, onCountChange, onViewPreview }: Props) {
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TeamFile | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent of file count changes
  useEffect(() => { onCountChange?.(files.length); }, [files.length, onCountChange]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listTeamFiles(teamId);
    setFiles(data);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team-files-${teamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_files', filter: `team_id=eq.${teamId}` },
        (payload) => {
          load();
          // Toast only for teammates' uploads, not your own
          if (payload.new.uploader_id !== currentUserId) {
            addToast(`New file shared: ${payload.new.name}`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'team_files', filter: `team_id=eq.${teamId}` },
        (payload) => setFiles(prev => prev.filter(f => f.id !== payload.old.id))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'team_files', filter: `team_id=eq.${teamId}` },
        (payload) => setFiles(prev => prev.map(f => f.id === payload.new.id ? { ...f, ...payload.new } : f))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teamId, currentUserId, load, addToast]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList);

    // Initialize queue
    const initial: QueueItem[] = items.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      pct: 0,
      status: 'uploading',
    }));
    setQueue(initial);

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      const qid = initial[i].id;

      if (file.size > 20 * 1024 * 1024) {
        setQueue(prev => prev.map(q => q.id === qid ? { ...q, status: 'error', pct: 0 } : q));
        addToast(`${file.name} exceeds 20 MB`, 'error');
        continue;
      }

      const result = await uploadTeamFile(teamId, currentUserId, file, (pct) => {
        setQueue(prev => prev.map(q => q.id === qid ? { ...q, pct } : q));
      });

      if (result) {
        setQueue(prev => prev.map(q => q.id === qid ? { ...q, pct: 100, status: 'done' } : q));
      } else {
        setQueue(prev => prev.map(q => q.id === qid ? { ...q, status: 'error' } : q));
        addToast(`Failed to upload ${file.name}`, 'error');
      }
    }

    // Clear queue after a short delay
    setTimeout(() => setQueue([]), 1800);
    load();
  }

  async function handleDelete(file: TeamFile) {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    await deleteTeamFile(file.id, file.file_path);
  }

  async function handleToggleVisibility(file: TeamFile) {
    const next = file.visibility === 'private' ? 'public' : 'private';
    setTogglingId(file.id);
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, visibility: next } : f));
    await setFileVisibility(file.id, next);
    setTogglingId(null);
  }

  // Sort + filter
  const displayed = useMemo(() => {
    let result = files.filter(f => mimeMatchesFilter(f.file_type, typeFilter));
    if (sortBy === 'oldest') result = [...result].reverse();
    else if (sortBy === 'type') result = [...result].sort((a, b) => a.file_type.localeCompare(b.file_type));
    return result;
  }, [files, sortBy, typeFilter]);

  const uploading = queue.some(q => q.status === 'uploading');
  const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pdf', label: 'PDF' },
    { key: 'doc', label: 'Doc' },
    { key: 'sheet', label: 'Sheet' },
    { key: 'image', label: 'Image' },
  ];

  // Non-member gate
  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-100'}`}>
          <Paperclip size={24} className={isDarkMode ? 'text-slate-500' : 'text-[#71767b]'} />
        </div>
        <p className={`text-sm font-semibold ${isDarkMode ? 'text-[#71767b]' : 'text-slate-500'}`}>
          Join this team to view and share files
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold max-w-xs ${
                t.type === 'error'
                  ? 'bg-rose-600 text-[#e7e9ea]'
                  : isDarkMode ? 'bg-[#16181c] border border-[#2f3336] text-[#e7e9ea]' : 'bg-white border border-slate-200 text-slate-900 shadow-black/10'
              }`}
            >
              {t.type === 'error'
                ? <AlertCircle size={13} className="flex-shrink-0" />
                : <CheckCircle2 size={13} className="flex-shrink-0 text-emerald-500" />
              }
              <span className="truncate">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div>
          <h3 className={`text-sm font-bold ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-900'}`}>Files</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
            {files.length} {files.length === 1 ? 'file' : 'files'} · max 20 MB each
          </p>
        </div>
      </div>

      {/* Filter & Sort Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap pt-1">
        {/* Left side: Type filter pills */}
        {files.length > 0 && (
          <div className={`flex items-center gap-1 p-0.5 rounded-xl w-fit border ${isDarkMode ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'}`}>
            {TYPE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  typeFilter === key
                    ? 'bg-blue-600 text-[#e7e9ea] shadow-sm'
                    : isDarkMode ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-[#71767b] hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Right side: Sort controls + Upload button */}
        <div className="flex items-center gap-2 flex-wrap ml-auto sm:ml-0">
          {/* Sort control */}
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border text-[11px] font-bold ${isDarkMode ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'}`}>
            <ArrowUpDown size={11} className={`ml-1.5 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`} />
            {(['newest', 'oldest', 'type'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 rounded-md capitalize transition-all ${
                  sortBy === s
                    ? isDarkMode ? 'bg-[#2f3336] text-[#e7e9ea]' : 'bg-[#17181c] text-[#e7e9ea]'
                    : isDarkMode ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-[#71767b] hover:text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[#e7e9ea] text-xs font-bold transition-all shadow-sm"
          >
            <Upload size={13} />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_MIME}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Upload progress queue */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-[#2f3336] bg-[#17181c]' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className="p-3 space-y-2">
              {queue.map(item => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold truncate flex-1 ${isDarkMode ? 'text-[#8b98a5]' : 'text-slate-700'}`}>
                      {item.name}
                    </span>
                    <span className={`text-[10px] font-bold flex-shrink-0 ${
                      item.status === 'error' ? 'text-rose-400' :
                      item.status === 'done' ? 'text-emerald-400' :
                      isDarkMode ? 'text-slate-500' : 'text-[#71767b]'
                    }`}>
                      {item.status === 'error' ? 'Failed' : item.status === 'done' ? 'Done' : `${item.pct}%`}
                    </span>
                  </div>
                  <div className={`h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-200'}`}>
                    <motion.div
                      animate={{ width: `${item.pct}%` }}
                      transition={{ ease: 'linear' }}
                      className={`h-full rounded-full ${
                        item.status === 'error' ? 'bg-rose-500' :
                        item.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag-and-drop zone — visible when no files */}
      {files.length === 0 && !loading && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 py-14 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
            dragging
              ? isDarkMode ? 'border-blue-500 bg-blue-500/10' : 'border-blue-400 bg-blue-50'
              : isDarkMode ? 'border-[#2f3336] hover:border-[#38444d]' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Upload size={28} className={isDarkMode ? 'text-slate-500' : 'text-[#8b98a5]'} />
          <div className="text-center">
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-[#71767b]' : 'text-slate-500'}`}>
              Drop files here or click to upload
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
              PDF · DOCX · XLSX · PNG · JPG · WebP · max 20 MB
            </p>
          </div>
        </div>
      )}

      {/* File grid with drag overlay */}
      {files.length > 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`relative transition-all ${dragging ? 'ring-2 ring-blue-500 ring-offset-2 rounded-2xl' : ''}`}
        >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`h-44 rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-100'}`} />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className={`py-12 rounded-2xl border text-center ${isDarkMode ? 'border-[#2f3336]' : 'border-slate-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>No files match this filter</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {displayed.map(file => (
                  <FileCard
                    key={file.id}
                    file={file}
                    currentUserId={currentUserId}
                    canManage={canManage}
                    toggling={togglingId === file.id}
                    isDarkMode={isDarkMode}
                    onDelete={() => handleDelete(file)}
                    onToggleVisibility={() => handleToggleVisibility(file)}
                    onPreview={() => onViewPreview ? onViewPreview(file.file_url, file.name) : setPreviewFile(file)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {/* Loading skeleton when first load */}
      {loading && files.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-44 rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-100'}`} />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className={`relative w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl ${
                isDarkMode ? 'bg-[#17181c] border border-[#2f3336]' : 'bg-white border border-slate-200'
              }`}
            >
              {/* Modal header */}
              <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b flex-shrink-0 ${isDarkMode ? 'border-[#2f3336]' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileIcon mime={previewFile.file_type} size={16} />
                  <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-900'}`}>
                    {previewFile.name}
                  </span>
                  <span className={`text-[10px] flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
                    {formatFileSize(previewFile.file_size)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => downloadFile(previewFile.file_url, previewFile.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isDarkMode ? 'bg-[#16181c] hover:bg-[#2f3336] text-[#8b98a5]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Download size={12} /> Download
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-[#16181c] text-slate-500' : 'hover:bg-slate-100 text-[#71767b]'}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 overflow-auto min-h-0">
                {previewFile.file_type.startsWith('image/') ? (
                  <div className="flex items-center justify-center p-4 h-full min-h-[400px]">
                    <img
                      src={previewFile.file_url}
                      alt={previewFile.name}
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (previewFile.file_type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    src={previewFile.file_url}
                    title={previewFile.name}
                    className="w-full h-[70vh]"
                  />
                ) : (previewFile.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     previewFile.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     previewFile.file_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                     previewFile.name.toLowerCase().endsWith('.doc') ||
                     previewFile.name.toLowerCase().endsWith('.docx') ||
                     previewFile.name.toLowerCase().endsWith('.xls') ||
                     previewFile.name.toLowerCase().endsWith('.xlsx') ||
                     previewFile.name.toLowerCase().endsWith('.ppt') ||
                     previewFile.name.toLowerCase().endsWith('.pptx')) ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.file_url)}`}
                    title={previewFile.name}
                    className="w-full h-[70vh]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
                    <FileIcon mime={previewFile.file_type} size={40} />
                    <div>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-[#8b98a5]' : 'text-slate-700'}`}>
                        Preview not available for this file type
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
                        Download the file to open it
                      </p>
                    </div>
                    <button
                      onClick={() => downloadFile(previewFile.file_url, previewFile.name)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#e7e9ea] text-sm font-bold transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── File Card ─────────────────────────────────────────────────────────────────

function FileCard({
  file, currentUserId, canManage, toggling, isDarkMode, onDelete, onToggleVisibility, onPreview,
}: {
  file: TeamFile;
  currentUserId: string;
  canManage: boolean;
  toggling: boolean;
  isDarkMode: boolean;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onPreview: () => void;
}) {
  const canDelete = canManage || file.uploader_id === currentUserId;
  const isPublic = file.visibility === 'public';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`group relative flex flex-col gap-2.5 p-3.5 rounded-2xl border transition-shadow hover:shadow-md ${
        isDarkMode ? 'border-[#2f3336] bg-[#17181c] hover:border-[#2f3336]' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Icon + visibility badge row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-[#16181c]' : 'bg-slate-50'}`}>
          <FileIcon mime={file.file_type} size={20} />
        </div>
        {canManage ? (
          <button
            onClick={onToggleVisibility}
            disabled={toggling}
            title={isPublic ? 'Make private' : 'Make public'}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all disabled:opacity-50 ${
              isPublic
                ? 'bg-emerald-600 text-[#e7e9ea] border-emerald-600'
                : isDarkMode ? 'border-[#2f3336] text-slate-500 hover:border-[#38444d]' : 'border-slate-200 text-[#71767b] hover:border-slate-300'
            }`}
          >
            {isPublic ? <Globe size={9} /> : <Lock size={9} />}
            {isPublic ? 'Public' : 'Private'}
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isPublic
              ? 'bg-emerald-600/15 text-emerald-500 border-emerald-600/20'
              : isDarkMode ? 'border-[#2f3336] text-slate-600' : 'border-slate-200 text-[#71767b]'
          }`}>
            {isPublic ? <Globe size={9} /> : <Lock size={9} />}
            {isPublic ? 'Public' : 'Private'}
          </span>
        )}
      </div>

      {/* File name */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight line-clamp-2 ${isDarkMode ? 'text-[#e7e9ea]' : 'text-slate-900'}`}>
          {file.name}
        </p>
        <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
          {formatFileSize(file.file_size)}
        </p>
      </div>

      {/* Uploader + date */}
      <div className="flex items-center gap-1.5 min-w-0">
        {(file.uploader?.avatar_url || file.uploader?.profile_pic) ? (
          <img src={(file.uploader.avatar_url || file.uploader.profile_pic)!} className="w-4 h-4 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div className={`w-4 h-4 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-[#2f3336]' : 'bg-slate-200'}`} />
        )}
        <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-[#71767b]'}`}>
          {file.uploader?.name ?? 'Unknown'} · {relativeDate(file.created_at)}
        </span>
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPreviewable(file.file_type, file.name) && (
          <button
            onClick={onPreview}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-[#16181c] hover:bg-[#2f3336] text-[#71767b] hover:text-[#e7e9ea]' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
            title="Preview"
          >
            <Eye size={12} />
          </button>
        )}
        <button
          onClick={() => downloadFile(file.file_url, file.name)}
          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-[#16181c] hover:bg-[#2f3336] text-[#71767b] hover:text-[#e7e9ea]' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
          title="Download"
        >
          <Download size={12} />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-[#16181c] hover:bg-rose-900/40 text-[#71767b] hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-50 text-[#71767b] hover:text-rose-500'}`}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
