import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, FolderOpen, ChevronRight, Search, Download, Eye, FileText, ArrowLeft, Home } from 'lucide-react';
import {
  StudyFolder, StudyMaterial, StudyMajor,
  listAllFolders, listMaterials, buildFolderTree,
  formatFileSize, fileIcon, MAJORS,
} from '../../lib/api/studyApi';
import Loader from '../ui/Loader';

interface Props {
  userMajor: string | null;
  isDarkMode: boolean;
  onPreviewFile: (url: string, name: string) => void;
}

async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(obj);
  } catch { window.open(url, '_blank', 'noreferrer'); }
}

function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

export default function StudyMaterials({ userMajor, isDarkMode, onPreviewFile }: Props) {
  const dk = isDarkMode;

  const [allFolders, setAllFolders] = useState<StudyFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation: stack of folders (breadcrumb)
  const [folderStack, setFolderStack] = useState<StudyFolder[]>([]);
  const currentFolder = folderStack[folderStack.length - 1] ?? null;

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [search, setSearch] = useState('');

  // Which major tab is active — default to user's own major
  const defaultMajor = (MAJORS.find(m => m.value === userMajor)?.value ?? null) as StudyMajor;
  const [activeMajor, setActiveMajor] = useState<StudyMajor>(defaultMajor);

  // Load all folders once
  const loadFolders = useCallback(async () => {
    setLoading(true);
    const flat = await listAllFolders();
    setAllFolders(flat);
    setLoading(false);
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  // Load materials when entering a folder
  useEffect(() => {
    if (!currentFolder) { setMaterials([]); return; }
    setLoadingMaterials(true);
    listMaterials(currentFolder.id).then(m => { setMaterials(m); setLoadingMaterials(false); });
  }, [currentFolder]);

  // Compute visible folders for current level and major
  const visibleFolders = useMemo(() => {
    // common folders (major === null) always visible
    const majorMatch = (f: StudyFolder) => f.major === activeMajor || f.major === null;
    if (!currentFolder) {
      // root level: show folders with no parent that match major visibility
      return allFolders.filter(f => f.parent_id === null && majorMatch(f));
    }
    return allFolders.filter(f => f.parent_id === currentFolder.id && majorMatch(f));
  }, [allFolders, currentFolder, activeMajor]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    if (!search.trim()) return materials;
    const q = search.toLowerCase();
    return materials.filter(m => m.title.toLowerCase().includes(q));
  }, [materials, search]);

  const enterFolder = (f: StudyFolder) => setFolderStack(prev => [...prev, f]);
  const goBack = () => setFolderStack(prev => prev.slice(0, -1));
  const goHome = () => setFolderStack([]);
  const goTo = (idx: number) => setFolderStack(prev => prev.slice(0, idx + 1));

  // UI helpers
  const surface = dk ? 'bg-[#17181c] text-[#e7e9ea]' : 'bg-white text-slate-900';
  const border = dk ? 'border-[#2f3336]/60' : 'border-slate-200';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const cardBg = dk ? 'bg-[#16181c]/60 border-[#2f3336] hover:border-[#38444d]' : 'bg-white border-slate-200 hover:border-slate-300';

  const majorMeta = MAJORS.find(m => m.value === activeMajor) ?? MAJORS[0];

  return (
    <div className={cls('rounded-2xl border overflow-hidden', surface, border)}>
      {/* Header */}
      <div className={cls('px-5 py-4 border-b', border, dk ? 'bg-[#16181c]/40' : 'bg-slate-50')}>
        <h2 className="text-base font-bold">Study Materials</h2>
        <p className={cls('text-xs mt-0.5', sub)}>Browse course materials for your major</p>
      </div>

      {/* Major tabs */}
      <div className={cls('flex gap-1 px-4 py-3 border-b overflow-x-auto', border, dk ? 'bg-[#16181c]/20' : 'bg-slate-50/50')}>
        {MAJORS.map(m => (
          <button
            key={String(m.value)}
            onClick={() => { setActiveMajor(m.value); setFolderStack([]); }}
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
      {folderStack.length > 0 && (
        <div className={cls('flex items-center gap-1 px-4 py-2 border-b text-xs', border, sub)}>
          <button onClick={goHome} className="hover:text-[#1e9df1] flex items-center gap-1"><Home size={12} /> Home</button>
          {folderStack.map((f, i) => (
            <React.Fragment key={f.id}>
              <ChevronRight size={12} className="opacity-40" />
              <button
                onClick={() => i < folderStack.length - 1 ? goTo(i) : undefined}
                className={cls(i === folderStack.length - 1 ? 'font-semibold text-[#1e9df1]' : 'hover:text-blue-500')}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search */}
      {currentFolder && (
        <div className={cls('px-4 py-2 border-b', border)}>
          <div className="relative">
            <Search size={13} className={cls('absolute left-3 top-1/2 -translate-y-1/2', sub)} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files…"
              className={cls(
                'w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1e9df1]/20',
                dk ? 'bg-[#16181c] border-[#38444d] text-white placeholder-[#71767b]' : 'bg-white border-slate-200 text-slate-900 placeholder-[#71767b]',
              )}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 min-h-[300px]">
        {loading ? (
          <div className="flex justify-center py-16"><Loader /></div>
        ) : (
          <>
            {/* Back button */}
            {folderStack.length > 0 && (
              <button
                onClick={goBack}
                className={cls('flex items-center gap-1.5 text-xs font-medium mb-4 px-3 py-1.5 rounded-lg border', border, dk ? 'hover:bg-[#16181c] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            {/* Sub-folders */}
            {visibleFolders.length > 0 && (
              <div className="mb-5">
                {currentFolder && <p className={cls('text-xs font-semibold mb-2', sub)}>FOLDERS</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {visibleFolders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => enterFolder(f)}
                      className={cls('flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm', cardBg)}
                    >
                      <span style={{ color: f.color }}><FolderOpen size={20} /></span>
                      <span className="text-sm font-medium truncate">{f.name}</span>
                      <ChevronRight size={14} className={cls('ml-auto flex-shrink-0', sub)} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Files (only when inside a folder) */}
            {currentFolder && (
              <>
                {filteredMaterials.length > 0 && (
                  <p className={cls('text-xs font-semibold mb-2', sub)}>FILES</p>
                )}
                {loadingMaterials ? (
                  <div className="flex justify-center py-8"><Loader /></div>
                ) : filteredMaterials.length === 0 && !visibleFolders.length ? (
                  <div className={cls('flex flex-col items-center justify-center py-12 text-center', sub)}>
                    <FileText size={32} className="opacity-30 mb-3" />
                    <p className="text-sm font-medium">{search ? 'No files match your search' : 'No files in this folder'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMaterials.map(m => (
                      <div
                        key={m.id}
                        className={cls('flex items-center gap-3 p-3 rounded-xl border transition-colors', cardBg)}
                      >
                        <span className="text-2xl flex-shrink-0">{fileIcon(m.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          {m.description && <p className={cls('text-xs truncate', sub)}>{m.description}</p>}
                          <p className={cls('text-xs', sub)}>
                            {formatFileSize(m.file_size)}
                            {m.file_size ? ' · ' : ''}
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => onPreviewFile(m.file_url, m.title)}
                            className={cls('p-2 rounded-lg border transition-colors text-xs font-medium', border, dk ? 'hover:bg-[#2f3336] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
                            title="Preview"
                          ><Eye size={14} /></button>
                          <button
                            onClick={() => downloadFile(m.file_url, m.title)}
                            className="p-2 rounded-lg bg-[#1e9df1] hover:bg-[#1677cc] text-white transition-colors"
                            title="Download"
                          ><Download size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Root empty state */}
            {!currentFolder && visibleFolders.length === 0 && (
              <div className={cls('flex flex-col items-center justify-center py-16 text-center', sub)}>
                <Folder size={40} className="opacity-30 mb-3" />
                <p className="text-sm font-medium">No materials for {majorMeta.label} yet</p>
                <p className="text-xs mt-1 opacity-70">Check back soon or try another major tab</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
