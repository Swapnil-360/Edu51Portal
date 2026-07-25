import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Folder, FolderOpen, ChevronRight, Search, Download, Eye,
  FileText, Loader2, ArrowLeft, Home, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  listDriveFolder, isFolder, driveFileIcon, driveFormatSize,
  drivePreviewUrl, DriveItem,
} from '../../lib/driveApi';
import { getDriveConfigForMajor, MAJORS, StudyMajor } from '../../lib/api/studyApi';
import Loader from '../ui/Loader';

interface Props {
  userMajor: string | null;
  isDarkMode: boolean;
  onPreviewFile: (url: string, name: string) => void;
}

function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

interface BreadcrumbEntry { id: string; name: string; }

export default function GDriveBrowser({ userMajor, isDarkMode: dk, onPreviewFile }: Props) {
  const defaultMajor = (MAJORS.find(m => m.value === userMajor)?.value ?? null) as StudyMajor;
  const [activeMajor, setActiveMajor] = useState<StudyMajor>(defaultMajor);

  // Only show the user's own major tab (+ Common); show all tabs only when major is unset
  const visibleMajors = userMajor
    ? MAJORS.filter(m => m.value === userMajor || m.value === null)
    : MAJORS;

  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Navigation stack: [{id, name}, ...]
  const [stack, setStack] = useState<BreadcrumbEntry[]>([]);
  const currentFolderId = stack.length > 0 ? stack[stack.length - 1].id : rootFolderId;

  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load root folder ID from Supabase config when major changes
  useEffect(() => {
    setConfigLoading(true);
    setStack([]);
    setItems([]);
    setError(null);
    getDriveConfigForMajor(activeMajor).then(id => {
      setRootFolderId(id);
      setConfigLoading(false);
    });
  }, [activeMajor]);

  // Fetch Drive folder contents when folderId or refreshKey changes
  useEffect(() => {
    if (!currentFolderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listDriveFolder(currentFolderId)
      .then(data => { if (!cancelled) { setItems(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [currentFolderId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const enterFolder = (item: DriveItem) => {
    setStack(prev => [...prev, { id: item.id, name: item.name }]);
    setSearch('');
  };
  const goBack = () => setStack(prev => prev.slice(0, -1));
  const goHome = () => { setStack([]); setSearch(''); };
  const goTo = (idx: number) => setStack(prev => prev.slice(0, idx + 1));

  const folders = useMemo(() => items.filter(isFolder), [items]);
  const files = useMemo(() => {
    const nonFolders = items.filter(i => !isFolder(i));
    if (!search.trim()) return nonFolders;
    const q = search.toLowerCase();
    return nonFolders.filter(i => i.name.toLowerCase().includes(q));
  }, [items, search]);

  // UI tokens
  const surface = dk ? 'bg-[#17181c] text-[#e7e9ea]' : 'bg-white text-slate-900';
  const border = dk ? 'border-[#2f3336]/60' : 'border-slate-200';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const cardBg = dk
    ? 'bg-[#16181c]/60 border-[#2f3336] hover:border-slate-500'
    : 'bg-white border-slate-200 hover:border-slate-300';
  const majorMeta = MAJORS.find(m => m.value === activeMajor) ?? MAJORS[0];

  const inRoot = stack.length === 0;

  return (
    <div className={cls('rounded-2xl border overflow-hidden', surface, border)}>
      {/* Header */}
      <div className={cls('flex items-center justify-between px-5 py-4 border-b', border, dk ? 'bg-[#16181c]/40' : 'bg-slate-50')}>
        <div>
          <h2 className="text-base font-bold">Study Materials</h2>
          <p className={cls('text-xs mt-0.5', sub)}>Synced from Google Drive · refreshes in real-time</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className={cls('p-2 rounded-lg border transition-colors', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-100', loading && 'opacity-50 cursor-not-allowed')}
          title="Refresh from Drive"
        >
          <RefreshCw size={15} className={cls(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Major tabs */}
      <div className={cls('flex gap-1 px-4 py-3 border-b overflow-x-auto', border, dk ? 'bg-[#16181c]/20' : 'bg-slate-50/50')}>
        {visibleMajors.map(m => (
          <button
            key={String(m.value)}
            onClick={() => { setActiveMajor(m.value); }}
            className={cls(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
              activeMajor === m.value
                ? 'text-white border-transparent shadow-sm'
                : dk ? 'border-[#38444d] text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-700',
            )}
            style={activeMajor === m.value ? { background: m.color } : {}}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      {stack.length > 0 && (
        <div className={cls('flex items-center gap-1 px-4 py-2 border-b text-xs', border, sub)}>
          <button onClick={goHome} className="hover:text-blue-500 flex items-center gap-1">
            <Home size={12} /> Home
          </button>
          {stack.map((entry, i) => (
            <React.Fragment key={entry.id}>
              <ChevronRight size={12} className="opacity-40" />
              <button
                onClick={() => i < stack.length - 1 ? goTo(i) : undefined}
                className={cls(i === stack.length - 1 ? 'font-semibold text-blue-500' : 'hover:text-blue-500')}
              >
                {entry.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search (inside folders) */}
      {!inRoot && (
        <div className={cls('px-4 py-2 border-b', border)}>
          <div className="relative">
            <Search size={13} className={cls('absolute left-3 top-1/2 -translate-y-1/2', sub)} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files…"
              className={cls(
                'w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                dk ? 'bg-[#16181c] border-[#38444d] text-white placeholder-[#71767b]' : 'bg-white border-slate-200 text-slate-900 placeholder-[#71767b]',
              )}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 min-h-[300px]">
        {configLoading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : !rootFolderId ? (
          <div className={cls('flex flex-col items-center justify-center py-16 text-center', sub)}>
            <Folder size={40} className="opacity-30 mb-3" />
            <p className="text-sm font-medium">No Drive folder configured for {majorMeta.label}</p>
            <p className="text-xs mt-1 opacity-70">Ask the admin to set up the Drive folder for this major</p>
          </div>
        ) : error ? (
          <div className={cls('flex flex-col items-center justify-center py-16 text-center gap-3', sub)}>
            <AlertCircle size={32} className="text-red-400 opacity-70" />
            <p className="text-sm font-medium text-red-400">Failed to load from Drive</p>
            <p className="text-xs opacity-70 max-w-xs">{error}</p>
            {error.toLowerCase().includes('permission') || error.includes('403') ? (
              <p className="text-xs text-amber-400 max-w-xs">
                The Drive folder may require Google sign-in. Ask the admin to set sharing to "Anyone with the link".
              </p>
            ) : null}
            <div className="flex gap-2 mt-1">
              <button
                onClick={refresh}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Retry
              </button>
              {rootFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${rootFolderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cls('px-4 py-1.5 rounded-lg border text-xs font-semibold', border, dk ? 'text-[#8b98a5] hover:bg-[#2f3336]' : 'text-slate-600 hover:bg-slate-50')}
                >
                  Open in Drive
                </a>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            {/* Back button */}
            {stack.length > 0 && (
              <button
                onClick={goBack}
                className={cls('flex items-center gap-1.5 text-xs font-medium mb-4 px-3 py-1.5 rounded-lg border', border, dk ? 'hover:bg-[#16181c] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            {/* Folders */}
            {folders.length > 0 && (
              <div className="mb-5">
                {!inRoot && <p className={cls('text-xs font-semibold mb-2', sub)}>FOLDERS</p>}
                <div className={cls('grid gap-2', inRoot ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => enterFolder(folder)}
                      className={cls('flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm', cardBg)}
                    >
                      <span className="text-xl flex-shrink-0"><FolderOpen size={20} className="text-amber-400" /></span>
                      <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
                      <ChevronRight size={14} className={cls('flex-shrink-0', sub)} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {!inRoot && (
              <>
                {files.length > 0 && (
                  <p className={cls('text-xs font-semibold mb-2', sub)}>FILES</p>
                )}
                {files.length === 0 && folders.length === 0 ? (
                  <div className={cls('flex flex-col items-center justify-center py-12 text-center', sub)}>
                    <FileText size={32} className="opacity-30 mb-3" />
                    <p className="text-sm font-medium">
                      {search ? 'No files match your search' : 'This folder is empty'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map(file => (
                      <div
                        key={file.id}
                        className={cls('flex items-center gap-3 p-3 rounded-xl border transition-colors', cardBg)}
                      >
                        <span className="text-2xl flex-shrink-0">{driveFileIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className={cls('text-xs', sub)}>
                            {driveFormatSize(file.size)}
                            {file.size && file.modifiedTime ? ' · ' : ''}
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => onPreviewFile(drivePreviewUrl(file), file.name)}
                            className={cls('p-2 rounded-lg border transition-colors', border, dk ? 'hover:bg-[#2f3336] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>
                          <a
                            href={file.webContentLink ?? file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            title="Download"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Root empty state */}
            {inRoot && folders.length === 0 && files.length === 0 && (
              <div className={cls('flex flex-col items-center justify-center py-16 text-center', sub)}>
                <Folder size={40} className="opacity-30 mb-3" />
                <p className="text-sm font-medium">No folders in the Drive yet</p>
                <p className="text-xs mt-1 opacity-70">Admin can add folders directly in Google Drive</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
