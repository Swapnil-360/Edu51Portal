import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen, ChevronRight, Home, ArrowLeft, RefreshCw,
  Upload, Trash2, Plus, Loader2, AlertCircle, Eye, Download,
  LogIn, LogOut, X, Check, Folder,
} from 'lucide-react';
import {
  listDriveFolder, isFolder, driveFileIcon, driveFormatSize,
  drivePreviewUrl, DriveItem, FOLDER_MIME,
  uploadFileToDrive, deleteFromDrive, createDriveFolder,
} from '../../lib/driveApi';
import { listDepartmentConfigs, DepartmentConfig } from '../../lib/api/studyApi';
import { DEPARTMENTS } from '../../config/departments';
import { useGoogleDriveAuth } from '../../hooks/useGoogleDriveAuth';
import ChipLoader from '../ui/ChipLoader';

interface Props {
  isDarkMode: boolean;
  onPreviewFile?: (url: string, name: string) => void;
}

interface Crumb { id: string; name: string; }
interface UploadItem { key: string; file: File; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string; }

function cls(...a: (string | false | undefined | null)[]) { return a.filter(Boolean).join(' '); }

export default function AdminDrivePanel({ isDarkMode: dk, onPreviewFile }: Props) {
  const { token, profile, loading: authLoading, getToken, signOut } = useGoogleDriveAuth();

  const [activeDepartment, setActiveDepartment] = useState<string>('CSE');
  const [configs, setConfigs] = useState<DepartmentConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  const [stack, setStack] = useState<Crumb[]>([]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const rootFolderId = configs.find(c => c.department === activeDepartment)?.folder_id ?? null;
  const currentFolderId = stack.length > 0 ? stack[stack.length - 1].id : rootFolderId;

  useEffect(() => {
    listDepartmentConfigs().then(c => { setConfigs(c); setConfigLoading(false); });
  }, []);

  useEffect(() => {
    setStack([]); setItems([]); setListError(null); setActionError(null);
    setShowNewFolder(false); setNewFolderName('');
  }, [activeDepartment]);

  useEffect(() => {
    if (!currentFolderId) return;
    let cancelled = false;
    setListLoading(true); setListError(null);
    listDriveFolder(currentFolderId)
      .then(d => { if (!cancelled) { setItems(d); setListLoading(false); } })
      .catch(e => { if (!cancelled) { setListError(e.message); setListLoading(false); } });
    return () => { cancelled = true; };
  }, [currentFolderId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const enterFolder = (item: DriveItem) => setStack(p => [...p, { id: item.id, name: item.name }]);
  const goBack = () => setStack(p => p.slice(0, -1));
  const goHome = () => setStack([]);
  const goTo = (i: number) => setStack(p => p.slice(0, i + 1));

  const naturalSort = (a: DriveItem, b: DriveItem) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  const folders = useMemo(() => items.filter(isFolder).sort(naturalSort), [items]);
  const files = useMemo(() => items.filter(i => !isFolder(i)).sort(naturalSort), [items]);
  const inRoot = stack.length === 0;

  // Clear folder input and error on success/cancel
  function dismissNewFolder() {
    setShowNewFolder(false);
    setNewFolderName('');
  }

  async function withAuth(fn: (t: string) => Promise<void>) {
    setActionError(null);
    try {
      const t = await getToken();
      await fn(t);
    } catch (e: unknown) {
      const msg = (e as Error).message ?? 'Unknown error';
      const isPerm = msg.toLowerCase().includes('permission') || msg.includes('403') || msg.includes('insufficientPermissions');
      setActionError(
        isPerm
          ? `"${profile?.email || 'This account'}" does not have write access to these Drive folders. Sign out and sign in with the Google account that created/owns those folders.`
          : msg,
      );
      dismissNewFolder();
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !currentFolderId) return;
    setCreatingFolder(true);
    let ok = false;
    await withAuth(async t => {
      await createDriveFolder(currentFolderId, newFolderName.trim(), t);
      ok = true;
    });
    setCreatingFolder(false);
    if (ok) { dismissNewFolder(); refresh(); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await withAuth(async t => {
      await deleteFromDrive(deleteTarget.id, t);
      setDeleteTarget(null);
      refresh();
    });
    setDeleting(false);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !currentFolderId) return;
    setActionError(null);
    const stamp = Date.now();
    const batch: UploadItem[] = Array.from(fileList).map((f, i) => ({
      key: `${stamp}-${i}`, file: f, status: 'pending' as const,
    }));
    setUploads(prev => [...prev, ...batch]);

    let accessToken: string;
    try { accessToken = await getToken(); }
    catch (e: unknown) {
      setActionError((e as Error).message ?? 'Auth error');
      setUploads(prev => prev.filter(u => !batch.find(b => b.key === u.key)));
      return;
    }

    for (const item of batch) {
      setUploads(prev => prev.map(u => u.key === item.key ? { ...u, status: 'uploading' } : u));
      try {
        await uploadFileToDrive(currentFolderId, item.file, accessToken);
        setUploads(prev => prev.map(u => u.key === item.key ? { ...u, status: 'done' } : u));
      } catch (e: unknown) {
        const msg = (e as Error).message ?? 'Upload failed';
        if (msg.toLowerCase().includes('permission'))
          setActionError('Permission denied — sign in with the Drive folder owner account.');
        setUploads(prev => prev.map(u => u.key === item.key ? { ...u, status: 'error', error: msg } : u));
      }
    }
    refresh();
    setTimeout(() => setUploads(prev => prev.filter(u => u.status === 'uploading')), 3000);
  }

  // Design tokens
  const border = dk ? 'border-[#2f3336]/60' : 'border-slate-200';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const card = dk
    ? 'bg-[#16181c]/50 border-[#2f3336] hover:border-slate-500 hover:bg-[#16181c]'
    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm';
  const surfaceAlt = dk ? 'bg-[#16181c]/30' : 'bg-slate-50';
  const inputCls = cls(
    'flex-1 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/30',
    dk ? 'bg-[#16181c] border-[#38444d] text-white placeholder-[#71767b]' : 'bg-white border-slate-200 text-slate-900 placeholder-[#71767b]',
  );

  if (configLoading) {
    return <div className="flex justify-center py-16"><ChipLoader size="lg" /></div>;
  }

  return (
    <div className="flex flex-col">

      {/* ── Row 1: Department tabs (scrollable) ── */}
      <div className={cls('flex gap-1.5 px-3 py-2.5 border-b overflow-x-auto scrollbar-none', border, surfaceAlt)}>
        {DEPARTMENTS.map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDepartment(d.key)}
            className={cls(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0',
              activeDepartment === d.key
                ? 'bg-blue-600 text-white border-transparent shadow-sm'
                : dk ? 'border-[#38444d] text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-700',
            )}
          >
            {d.label}
            {!configs.find(c => c.department === d.key)?.active && <span className="opacity-60"> · Coming Soon</span>}
          </button>
        ))}
      </div>

      {/* ── Row 2: Auth controls ── */}
      <div className={cls('flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b', border)}>
        {token ? (
          /* Google profile card */
          <div className="flex items-center gap-2.5 min-w-0">
            {profile?.picture ? (
              <img
                src={profile.picture}
                alt={profile.name ?? profile.email}
                className="w-8 h-8 rounded-full ring-2 ring-green-400/50 flex-shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 ring-2 ring-green-400/50">
                <span className="text-white text-xs font-bold">
                  {(profile?.name?.[0] ?? profile?.email?.[0] ?? 'G').toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className={cls('text-xs font-semibold truncate', dk ? 'text-[#d9d9d9]' : 'text-slate-800')}>
                {profile?.name ?? profile?.email ?? 'Google Account'}
              </p>
              <p className={cls('text-xs truncate', sub)}>{profile?.email}</p>
            </div>
          </div>
        ) : (
          <p className={cls('text-xs', sub)}>Sign in with the Google account that owns these Drive folders</p>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {token ? (
            <button
              onClick={signOut}
              className={cls('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors', border, sub, 'hover:text-red-400')}
            >
              <LogOut size={12} /> Sign out
            </button>
          ) : (
            <button
              onClick={() => getToken()}
              disabled={authLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {authLoading ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
              Sign in to manage
            </button>
          )}
          <button
            onClick={refresh}
            disabled={listLoading}
            className={cls('p-1.5 rounded-lg border transition-colors', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-100')}
            title="Refresh"
          >
            <RefreshCw size={13} className={cls(listLoading && 'animate-spin', sub)} />
          </button>
        </div>
      </div>

      {/* ── Permission / action error banner ── */}
      {actionError && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border-b border-red-500/20">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="flex-1 text-xs text-red-300 leading-relaxed">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-300 flex-shrink-0 mt-0.5">
            <X size={13} />
          </button>
        </div>
      )}

      {!rootFolderId ? (
        <div className={cls('flex flex-col items-center justify-center py-16 text-center px-4', sub)}>
          <Folder size={36} className="opacity-30 mb-3" />
          <p className="text-sm font-medium">No Drive folder configured for this department</p>
          <p className="text-xs mt-1 opacity-70">Go to the Department Config tab to set a folder ID</p>
        </div>
      ) : (
        <>
          {/* ── Row 3: Breadcrumb + action buttons ── */}
          <div className={cls('flex flex-wrap items-center gap-2 px-3 py-2 border-b', border)}>
            {/* Breadcrumb */}
            <div className={cls('flex items-center gap-1 text-xs flex-1 min-w-0 overflow-x-auto scrollbar-none', sub)}>
              <button onClick={goHome} className="flex items-center gap-1 hover:text-blue-500 flex-shrink-0 font-medium">
                <Home size={12} /> Home
              </button>
              {stack.map((cr, i) => (
                <React.Fragment key={cr.id}>
                  <ChevronRight size={11} className="opacity-40 flex-shrink-0" />
                  <button
                    onClick={() => i < stack.length - 1 ? goTo(i) : undefined}
                    className={cls(
                      'whitespace-nowrap flex-shrink-0 font-medium',
                      i === stack.length - 1 ? 'text-blue-500' : 'hover:text-blue-500',
                    )}
                  >
                    {cr.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Action buttons — only when signed in */}
            {token && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { setActionError(null); setShowNewFolder(v => !v); setNewFolderName(''); }}
                  className={cls(
                    'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors',
                    border,
                    dk ? 'hover:bg-[#2f3336] text-[#8b98a5]' : 'hover:bg-slate-100 text-slate-600',
                  )}
                >
                  <Plus size={12} /> Folder
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
                >
                  <Upload size={12} /> Upload
                </button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { handleFiles(e.target.files); if (fileRef.current) fileRef.current.value = ''; }} />
              </div>
            )}
          </div>

          {/* ── New folder input ── */}
          {showNewFolder && (
            <div className={cls('flex items-center gap-2 px-3 py-2.5 border-b', border, surfaceAlt)}>
              <FolderOpen size={15} className="text-amber-400 flex-shrink-0" />
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') dismissNewFolder();
                }}
                placeholder="New folder name…"
                className={inputCls}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="p-2 text-green-500 hover:text-green-400 disabled:opacity-40 flex-shrink-0 transition-colors"
                title="Create"
              >
                {creatingFolder ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
              <button onClick={dismissNewFolder} className={cls('p-2 hover:text-red-400 flex-shrink-0 transition-colors', sub)}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* ── Upload progress ── */}
          {uploads.length > 0 && (
            <div className={cls('px-3 py-2 border-b space-y-1', border, surfaceAlt)}>
              {uploads.map(u => (
                <div key={u.key} className="flex items-center gap-2 text-xs">
                  {u.status === 'uploading' && <Loader2 size={11} className="animate-spin text-blue-500 flex-shrink-0" />}
                  {u.status === 'done' && <Check size={11} className="text-green-500 flex-shrink-0" />}
                  {u.status === 'error' && <AlertCircle size={11} className="text-red-400 flex-shrink-0" />}
                  {u.status === 'pending' && <div className="w-[11px] h-[11px] rounded-full border border-slate-500 flex-shrink-0" />}
                  <span className={cls('flex-1 truncate', u.status === 'error' ? 'text-red-400' : sub)}>
                    {u.file.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Main content ── */}
          <div
            className={cls('p-3 min-h-[260px] relative', isDragging && 'ring-2 ring-blue-500 ring-inset rounded-b-xl')}
            onDragOver={e => { e.preventDefault(); if (token) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); if (token) handleFiles(e.dataTransfer.files); }}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none rounded-b-xl">
                <p className="text-blue-400 font-semibold text-sm">Drop files to upload</p>
              </div>
            )}

            {listError ? (
              <div className={cls('flex flex-col items-center justify-center py-12 text-center gap-3', sub)}>
                <AlertCircle size={28} className="text-red-400 opacity-70" />
                <p className="text-sm font-medium text-red-400">Failed to load from Drive</p>
                <p className="text-xs opacity-70 max-w-xs">{listError}</p>
                <button onClick={refresh} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">Retry</button>
              </div>
            ) : listLoading ? (
              <div className="flex justify-center py-12"><ChipLoader size="md" /></div>
            ) : (
              <>
                {stack.length > 0 && (
                  <button
                    onClick={goBack}
                    className={cls('flex items-center gap-1.5 text-xs font-medium mb-3 px-3 py-1.5 rounded-lg border', border, dk ? 'hover:bg-[#16181c] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
                  >
                    <ArrowLeft size={12} /> Back
                  </button>
                )}

                {/* Folders grid */}
                {folders.length > 0 && (
                  <div className="mb-3">
                    {!inRoot && <p className={cls('text-xs font-semibold mb-2 px-1', sub)}>FOLDERS</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {folders.map(f => (
                        <div key={f.id} className={cls('flex items-center gap-2 p-3 rounded-xl border group transition-all', card)}>
                          <button
                            onClick={() => enterFolder(f)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            <FolderOpen size={17} className="text-amber-400 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{f.name}</span>
                            <ChevronRight size={13} className={cls('ml-auto flex-shrink-0', sub)} />
                          </button>
                          {token && (
                            <button
                              onClick={() => setDeleteTarget(f)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                              title="Delete folder"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files list */}
                {!inRoot && files.length > 0 && (
                  <>
                    <p className={cls('text-xs font-semibold mb-2 px-1', sub)}>FILES</p>
                    <div className="space-y-2">
                      {files.map(f => (
                        <div key={f.id} className={cls('flex items-center gap-3 p-3 rounded-xl border group transition-all', card)}>
                          <span className="text-xl flex-shrink-0">{driveFileIcon(f.mimeType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{f.name}</p>
                            <p className={cls('text-xs', sub)}>
                              {[driveFormatSize(f.size), f.modifiedTime && new Date(f.modifiedTime).toLocaleDateString()].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {onPreviewFile && (
                              <button
                                onClick={() => onPreviewFile(drivePreviewUrl(f), f.name)}
                                className={cls('p-1.5 rounded-lg border transition-colors', border, dk ? 'hover:bg-[#2f3336] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
                                title="Preview"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            <a
                              href={f.webContentLink ?? f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`}
                              target="_blank" rel="noreferrer"
                              className={cls('p-1.5 rounded-lg border transition-colors', border, dk ? 'hover:bg-[#2f3336] text-slate-400' : 'hover:bg-slate-50 text-slate-500')}
                              title="Download"
                            >
                              <Download size={13} />
                            </a>
                            {token && (
                              <button
                                onClick={() => setDeleteTarget(f)}
                                className="p-1.5 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Empty state */}
                {folders.length === 0 && (inRoot || files.length === 0) && (
                  <div className={cls('flex flex-col items-center justify-center py-12 text-center', sub)}>
                    <Folder size={32} className="opacity-30 mb-3" />
                    <p className="text-sm font-medium">{inRoot ? 'No folders in this Drive yet' : 'Empty folder'}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {token ? 'Use the Upload or + Folder buttons above' : 'Sign in to manage files'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className={cls(
            'w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4',
            dk ? 'bg-[#17181c] border-[#2f3336] text-[#e7e9ea]' : 'bg-white border-slate-200 text-slate-900',
          )}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">Delete "{deleteTarget.name}"?</p>
                <p className={cls('text-xs mt-1 leading-relaxed', sub)}>
                  {deleteTarget.mimeType === FOLDER_MIME
                    ? 'This deletes the folder and ALL its contents from Google Drive. This cannot be undone.'
                    : 'This permanently deletes the file from Google Drive.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className={cls('px-4 py-2 rounded-xl text-sm border font-medium', dk ? 'border-[#38444d] hover:bg-[#16181c]' : 'border-slate-200 hover:bg-slate-50')}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
