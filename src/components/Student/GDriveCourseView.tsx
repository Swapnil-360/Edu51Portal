import React, { useState, useEffect } from 'react';
import {
  FileText, Play, Eye, Download, RefreshCw, AlertCircle,
  ChevronLeft, Folder, Loader2, BookOpen, Zap,
} from 'lucide-react';
import { getCurrentSemesterStatus } from '../../config/semester';
import Loader from '../ui/Loader';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
}

interface GDriveCourseViewProps {
  courseCode: string;
  courseName: string;
  folderId: string;
  folderLink: string;
  onBack: () => void;
  onFileClick?: (file: DriveFile) => void;
  isDarkMode?: boolean;
}

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

function cls(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(' '); }

function fmt(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileStyle(mime: string, dk: boolean) {
  const pairs: [string, string, string][] = [
    ['pdf',          dk ? 'bg-red-500/12 text-red-400'     : 'bg-red-50 text-red-500',     'pdf'],
    ['video',        dk ? 'bg-violet-500/12 text-violet-400': 'bg-violet-50 text-violet-500','vid'],
    ['image',        dk ? 'bg-pink-500/12 text-pink-400'   : 'bg-pink-50 text-pink-500',   'img'],
    ['presentation', dk ? 'bg-orange-500/12 text-orange-400': 'bg-orange-50 text-orange-500','ppt'],
    ['powerpoint',   dk ? 'bg-orange-500/12 text-orange-400': 'bg-orange-50 text-orange-500','ppt'],
  ];
  for (const [key, cls] of pairs) if (mime.includes(key)) return cls;
  return dk ? 'bg-blue-500/12 text-blue-400' : 'bg-blue-50 text-blue-500';
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.includes('video')) return <Play className="h-3.5 w-3.5" />;
  if (mime.includes('image')) return <Eye className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export const GDriveCourseView: React.FC<GDriveCourseViewProps> = ({
  courseCode, courseName, folderId, onBack, onFileClick, isDarkMode = false,
}) => {
  const dk = isDarkMode;
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<'mid' | 'final'>('mid');
  const [midFolderId, setMidFolderId]       = useState('');
  const [finalFolderId, setFinalFolderId]   = useState('');
  const [midContent, setMidContent]         = useState<DriveFolder[]>([]);
  const [finalContent, setFinalContent]     = useState<DriveFolder[]>([]);
  const [isMidPeriod, setIsMidPeriod]       = useState(false);

  useEffect(() => {
    const s = getCurrentSemesterStatus();
    if (s.currentPhase === 'Mid-term Examinations') { setIsMidPeriod(true); setActiveTab('mid'); }
    else if (s.currentPhase === 'Final Examinations') setActiveTab('final');
  }, []);

  useEffect(() => { load(); }, [folderId]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const q = encodeURIComponent(`'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=files(id,name)&pageSize=100`);
      if (!res.ok) throw new Error();
      const { files = [] } = await res.json();
      const midF   = files.find((f: any) => f.name.toLowerCase().includes('mid'));
      const finalF = files.find((f: any) => f.name.toLowerCase().includes('final'));
      if (midF)   { setMidFolderId(midF.id);     await loadContent(midF.id, 'mid'); }
      if (finalF) { setFinalFolderId(finalF.id); await loadContent(finalF.id, 'final'); }
      if (!midF && !finalF) setError('No Mid or Final folders found inside this course folder.');
    } catch {
      setError('Failed to load materials. Please check your connection.');
    } finally { setLoading(false); }
  };

  const loadContent = async (parentId: string, type: 'mid' | 'final') => {
    try {
      const [sfRes, rfRes] = await Promise.all([
        fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&key=${API_KEY}&fields=files(id,name)&pageSize=100&orderBy=name`),
        fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`)}&key=${API_KEY}&fields=files(id,name,mimeType,size,webViewLink,webContentLink)&pageSize=100&orderBy=name`),
      ]);
      const subfolders = (await sfRes.json()).files ?? [];
      const rootFiles  = (await rfRes.json()).files ?? [];
      const result: DriveFolder[] = [];
      if (rootFiles.length) result.push({ id: parentId, name: 'General Materials', files: rootFiles });
      for (const sf of subfolders) {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${sf.id}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`)}&key=${API_KEY}&fields=files(id,name,mimeType,size,webViewLink,webContentLink)&pageSize=100&orderBy=name`);
        const files = (await r.json()).files ?? [];
        if (files.length) result.push({ id: sf.id, name: sf.name, files });
      }
      if (type === 'mid') setMidContent(result);
      else setFinalContent(result);
    } catch { /* silent */ }
  };

  const content    = activeTab === 'mid' ? midContent : finalContent;
  const totalFiles = content.reduce((s, f) => s + f.files.length, 0);
  const midCount   = midContent.reduce((s, f) => s + f.files.length, 0);
  const finalCount = finalContent.reduce((s, f) => s + f.files.length, 0);
  const hasTabs    = !error && (!!midFolderId || !!finalFolderId);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader />
      <p className={cls('text-xs', dk ? 'text-slate-500' : 'text-slate-400')}>Loading materials…</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Back */}
      <button
        onClick={onBack}
        className={cls(
          'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
          dk ? 'text-slate-400 hover:text-[#d9d9d9]' : 'text-slate-500 hover:text-slate-800',
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Courses
      </button>

      {/* Course header card */}
      <div className={cls(
        'relative rounded-xl border overflow-hidden',
        dk ? 'bg-[#16181c]/60 border-[#2f3336]/70' : 'bg-white border-slate-200',
      )}>
        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

        <div className="p-5 sm:p-6 flex items-start gap-4">
          <div className={cls('flex-shrink-0 p-2.5 rounded-lg mt-0.5', dk ? 'bg-[#2f3336]' : 'bg-slate-100')}>
            <BookOpen className={cls('h-5 w-5', dk ? 'text-[#8b98a5]' : 'text-slate-600')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cls('text-[11px] font-semibold tracking-widest uppercase mb-1', dk ? 'text-slate-500' : 'text-slate-400')}>
              {courseCode}
            </p>
            <h1 className={cls('text-lg sm:text-xl font-bold leading-snug', dk ? 'text-[#e7e9ea]' : 'text-slate-900')}>
              {courseName}
            </h1>
            {isMidPeriod && (
              <div className={cls(
                'mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold',
                dk ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700',
              )}>
                <Zap className="h-3 w-3" />
                Mid-term Period Active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar — clean underline style */}
      {hasTabs && (
        <div className={cls('border-b', dk ? 'border-[#2f3336]' : 'border-slate-200')}>
          <div className="flex gap-0">
            {(['mid', 'final'] as const).map(t => {
              const count  = t === 'mid' ? midCount : finalCount;
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={cls(
                    'relative flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium transition-colors duration-150 focus:outline-none',
                    active
                      ? dk ? 'text-[#e7e9ea]' : 'text-slate-900'
                      : dk ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  {t === 'mid' ? 'Mid-term' : 'Final'}
                  {count > 0 && (
                    <span className={cls(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold leading-none tabular-nums',
                      active
                        ? dk ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-100 text-violet-700'
                        : dk ? 'bg-[#2f3336] text-slate-500' : 'bg-slate-100 text-slate-400',
                    )}>
                      {count}
                    </span>
                  )}
                  {/* Active underline */}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-violet-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className={cls(
          'rounded-xl p-4 border flex items-start gap-3',
          dk ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-200',
        )}>
          <AlertCircle className={cls('h-4 w-4 flex-shrink-0 mt-0.5', dk ? 'text-amber-400' : 'text-amber-600')} />
          <div>
            <p className={cls('text-sm mb-2', dk ? 'text-amber-300' : 'text-amber-800')}>{error}</p>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Material sections */}
      {!error && content.length > 0 && (
        <div className="space-y-4">
          {content.map(folder => (
            <div key={folder.id} className={cls('rounded-xl border overflow-hidden', dk ? 'border-[#2f3336]/60' : 'border-slate-200')}>

              {/* Folder header */}
              <div className={cls(
                'flex items-center gap-2.5 px-4 py-3 border-b',
                dk ? 'bg-[#16181c]/80 border-[#2f3336]/60' : 'bg-slate-50 border-slate-200',
              )}>
                <Folder className={cls('h-3.5 w-3.5 flex-shrink-0', dk ? 'text-slate-500' : 'text-slate-400')} />
                <span className={cls('text-sm font-semibold', dk ? 'text-[#8b98a5]' : 'text-slate-700')}>{folder.name}</span>
                <span className={cls(
                  'ml-auto text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded',
                  dk ? 'bg-[#2f3336] text-slate-500' : 'bg-slate-200 text-slate-500',
                )}>
                  {folder.files.length}
                </span>
              </div>

              {/* File list */}
              <div className={cls('divide-y', dk ? 'divide-[#2f3336]/60' : 'divide-slate-100')}>
                {folder.files.map(file => {
                  const accent = fileStyle(file.mimeType, dk);
                  return (
                    <div
                      key={file.id}
                      onClick={() => onFileClick?.(file)}
                      className={cls(
                        'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100',
                        dk ? 'hover:bg-[#2f3336]/40' : 'hover:bg-slate-50',
                      )}
                    >
                      {/* Type indicator */}
                      <div className={cls('flex-shrink-0 p-1.5 rounded-md', accent)}>
                        <FileIcon mime={file.mimeType} />
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className={cls('text-sm font-medium truncate', dk ? 'text-[#d9d9d9]' : 'text-slate-800')}>
                          {file.name}
                        </p>
                        {file.size && (
                          <p className={cls('text-[11px] mt-0.5', dk ? 'text-slate-600' : 'text-slate-400')}>{fmt(file.size)}</p>
                        )}
                      </div>

                      {/* Actions — always visible on mobile, hover-reveal on desktop */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); onFileClick?.(file); }}
                          className={cls(
                            'p-1.5 rounded-md transition-colors',
                            dk ? 'text-slate-500 hover:text-[#d9d9d9] hover:bg-[#2f3336]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                          )}
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={file.webContentLink ?? file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`}
                          target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className={cls(
                            'p-1.5 rounded-md transition-colors',
                            dk ? 'text-slate-500 hover:text-[#d9d9d9] hover:bg-[#2f3336]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200',
                          )}
                          title="Open in Drive"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!error && totalFiles === 0 && (midFolderId || finalFolderId) && (
        <div className={cls(
          'rounded-xl border p-10 text-center',
          dk ? 'bg-[#16181c]/40 border-[#2f3336]' : 'bg-slate-50 border-slate-200',
        )}>
          <Folder className={cls('h-10 w-10 mx-auto mb-3 opacity-25', dk ? 'text-slate-400' : 'text-slate-600')} />
          <p className={cls('text-sm font-medium mb-1', dk ? 'text-slate-400' : 'text-slate-600')}>
            No files in {activeTab === 'mid' ? 'Mid-term' : 'Final'} folder yet
          </p>
          <p className={cls('text-xs mb-4', dk ? 'text-slate-600' : 'text-slate-400')}>Materials will appear once uploaded to Drive</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2f3336] hover:bg-[#38444d] text-[#d9d9d9] text-sm font-medium transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      )}

    </div>
  );
};
