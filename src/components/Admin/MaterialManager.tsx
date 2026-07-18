import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2,
  Edit2, Upload, X, Check, FileText, Loader2, AlertTriangle,
  GripVertical, RefreshCw, Eye, Link,
} from 'lucide-react';
const GDriveBrowserLazy = lazy(() => import('../Student/GDriveBrowser'));
const AdminDrivePanelLazy = lazy(() => import('./AdminDrivePanel'));
import {
  StudyFolder, StudyMaterial, StudyMajor,
  listAllFolders, createFolder, updateFolder, deleteFolder,
  listMaterials, uploadMaterial, updateMaterial, deleteMaterial,
  buildFolderTree, formatFileSize, fileIcon,
  MAJORS, FOLDER_COLORS,
  DriveConfig, listDriveConfigs, upsertDriveConfig,
  DepartmentConfig, listDepartmentConfigs, upsertDepartmentConfig,
} from '../../lib/api/studyApi';
import { DEPARTMENTS } from '../../config/departments';

interface Props {
  isDarkMode: boolean;
  currentUserId: string;
  onPreviewFile?: (url: string, name: string) => void;
}

// ── Small helpers ────────────────────────────────────────────────────

function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

// ── Folder tree node ─────────────────────────────────────────────────

interface TreeNodeProps {
  folder: StudyFolder;
  depth: number;
  selectedId: string | null;
  onSelect: (f: StudyFolder) => void;
  onAddChild: (parent: StudyFolder) => void;
  onRename: (f: StudyFolder) => void;
  onDelete: (f: StudyFolder) => void;
  isDarkMode: boolean;
}

function TreeNode({ folder, depth, selectedId, onSelect, onAddChild, onRename, onDelete, isDarkMode }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isSelected = selectedId === folder.id;

  return (
    <div>
      <div
        className={cls(
          'group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors select-none',
          isSelected
            ? isDarkMode ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700'
            : isDarkMode ? 'hover:bg-[#2f3336]/50 text-[#8b98a5]' : 'hover:bg-slate-100 text-slate-700',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => { onSelect(folder); if (hasChildren) setOpen(o => !o); }}
      >
        {/* expand caret */}
        <span className="w-4 flex-shrink-0 flex items-center justify-center">
          {hasChildren
            ? open
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />
            : <span className="w-3" />}
        </span>
        {/* folder icon */}
        <span style={{ color: folder.color }} className="flex-shrink-0">
          {open && hasChildren ? <FolderOpen size={15} /> : <Folder size={15} />}
        </span>
        <span className="truncate flex-1 font-medium">{folder.name}</span>
        {/* actions — visible on hover */}
        <span className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onAddChild(folder); }}
            className={cls('p-0.5 rounded', isDarkMode ? 'hover:bg-[#38444d]' : 'hover:bg-slate-200')}
            title="Add subfolder"
          ><Plus size={11} /></button>
          <button
            onClick={e => { e.stopPropagation(); onRename(folder); }}
            className={cls('p-0.5 rounded', isDarkMode ? 'hover:bg-[#38444d]' : 'hover:bg-slate-200')}
            title="Rename"
          ><Edit2 size={11} /></button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(folder); }}
            className={cls('p-0.5 rounded text-red-400', isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50')}
            title="Delete"
          ><Trash2 size={11} /></button>
        </span>
      </div>
      {open && hasChildren && (
        <div>
          {folder.children!.map(child => (
            <TreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────

interface UploadItem {
  file: File;
  title: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

// ── Main component ────────────────────────────────────────────────────

export default function MaterialManager({ isDarkMode, currentUserId, onPreviewFile }: Props) {
  const dk = isDarkMode;

  // Data
  const [allFolders, setAllFolders] = useState<StudyFolder[]>([]);
  const [trees, setTrees] = useState<Record<string, StudyFolder[]>>({});
  const [selectedFolder, setSelectedFolder] = useState<StudyFolder | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Tab
  const [activeMajor, setActiveMajor] = useState<StudyMajor>(null);
  const [activeTab, setActiveTab] = useState<'folders' | 'drive' | 'departments'>('folders');

  // Drive config
  const [driveConfigs, setDriveConfigs] = useState<DriveConfig[]>([]);
  const [driveEditing, setDriveEditing] = useState<Record<string, { folderId: string; label: string }>>({});
  const [driveSaving, setDriveSaving] = useState<string | null>(null);

  // Department Drive config (Department -> Semester -> Course hierarchy)
  const [departmentConfigs, setDepartmentConfigs] = useState<DepartmentConfig[]>([]);
  const [departmentEditing, setDepartmentEditing] = useState<Record<string, { folderId: string; label: string }>>({});
  const [departmentSaving, setDepartmentSaving] = useState<string | null>(null);

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createParent, setCreateParent] = useState<StudyFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [savingFolder, setSavingFolder] = useState(false);

  const [renameFolder, setRenameFolder] = useState<StudyFolder | null>(null);
  const [renameName, setRenameName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder'; item: StudyFolder } | { type: 'material'; item: StudyMaterial } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename material inline
  const [renamingMaterial, setRenamingMaterial] = useState<string | null>(null);
  const [renameMaterialName, setRenameMaterialName] = useState('');

  // Upload
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load ────────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    const flat = await listAllFolders();
    setAllFolders(flat);
    // Build separate trees per major tab
    const grouped: Record<string, StudyFolder[]> = {};
    for (const m of MAJORS) {
      const key = m.value ?? 'common';
      const subset = flat.filter(f => f.major === m.value);
      grouped[key] = buildFolderTree(subset);
    }
    setTrees(grouped);
    setLoadingFolders(false);
  }, []);

  const loadDriveConfigs = useCallback(async () => {
    const configs = await listDriveConfigs();
    setDriveConfigs(configs);
    const editing: Record<string, { folderId: string; label: string }> = {};
    for (const m of MAJORS) {
      const key = String(m.value);
      const found = configs.find(c => c.major === m.value);
      editing[key] = { folderId: found?.folder_id ?? '', label: found?.label ?? m.label };
    }
    setDriveEditing(editing);
  }, []);

  const loadDepartmentConfigs = useCallback(async () => {
    const configs = await listDepartmentConfigs();
    setDepartmentConfigs(configs);
    const editing: Record<string, { folderId: string; label: string }> = {};
    for (const d of DEPARTMENTS) {
      const found = configs.find(c => c.department === d.key);
      editing[d.key] = { folderId: found?.folder_id ?? '', label: found?.label ?? d.label };
    }
    setDepartmentEditing(editing);
  }, []);

  useEffect(() => { loadFolders(); loadDriveConfigs(); loadDepartmentConfigs(); }, [loadFolders, loadDriveConfigs, loadDepartmentConfigs]);

  useEffect(() => {
    if (!selectedFolder) { setMaterials([]); return; }
    setLoadingMaterials(true);
    listMaterials(selectedFolder.id).then(m => { setMaterials(m); setLoadingMaterials(false); });
  }, [selectedFolder]);

  // ── Folder CRUD ─────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    await createFolder(newFolderName.trim(), activeMajor, createParent?.id ?? null, newFolderColor, currentUserId);
    setSavingFolder(false);
    setShowCreateFolder(false);
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setCreateParent(null);
    await loadFolders();
  };

  const handleRenameFolder = async () => {
    if (!renameFolder || !renameName.trim()) return;
    await updateFolder(renameFolder.id, { name: renameName.trim() });
    setRenameFolder(null);
    await loadFolders();
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    if (deleteTarget.type === 'folder') {
      await deleteFolder(deleteTarget.item.id);
      if (selectedFolder?.id === deleteTarget.item.id) setSelectedFolder(null);
      await loadFolders();
    } else {
      const m = deleteTarget.item as StudyMaterial;
      await deleteMaterial(m.id, m.file_path);
      setMaterials(prev => prev.filter(x => x.id !== m.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // ── Upload ───────────────────────────────────────────────────────────

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    setUploadItems(prev => [
      ...prev,
      ...arr.map(f => ({ file: f, title: f.name.replace(/\.[^.]+$/, ''), progress: 0, status: 'pending' as const })),
    ]);
  };

  const runUploads = async () => {
    if (!selectedFolder) return;
    const pending = uploadItems.filter(u => u.status === 'pending');
    for (const item of pending) {
      setUploadItems(prev => prev.map(u => u.file === item.file ? { ...u, status: 'uploading' } : u));
      const result = await uploadMaterial(
        selectedFolder.id, item.file, item.title, '', currentUserId,
        pct => setUploadItems(prev => prev.map(u => u.file === item.file ? { ...u, progress: pct } : u)),
      );
      setUploadItems(prev => prev.map(u =>
        u.file === item.file ? { ...u, status: result ? 'done' : 'error', progress: result ? 100 : 0 } : u,
      ));
      if (result) setMaterials(prev => [...prev, result]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRenameMaterial = async (id: string) => {
    if (!renameMaterialName.trim()) { setRenamingMaterial(null); return; }
    await updateMaterial(id, { title: renameMaterialName.trim() });
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, title: renameMaterialName.trim() } : m));
    setRenamingMaterial(null);
  };

  // ── Render ───────────────────────────────────────────────────────────

  const activeKey = activeMajor ?? 'common';
  const tree = trees[activeKey] ?? [];
  const majorMeta = MAJORS.find(m => m.value === activeMajor)!;
  const pendingUploads = uploadItems.filter(u => u.status === 'pending');
  const hasUploads = uploadItems.length > 0;

  const surface = dk ? 'bg-[#17181c] text-[#e7e9ea]' : 'bg-white text-slate-900';
  const border = dk ? 'border-[#2f3336]' : 'border-slate-200';
  const sub = dk ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${dk ? 'bg-[#16181c] border-[#38444d] text-white placeholder-[#71767b]' : 'bg-white border-slate-300 text-slate-900 placeholder-[#71767b]'}`;

  return (
    <div className={cls('rounded-2xl border overflow-hidden', surface, border)}>
      {/* Header */}
      <div className={cls('flex items-center justify-between px-5 py-4 border-b', border, dk ? 'bg-[#16181c]/50' : 'bg-slate-50')}>
        <div>
          <h2 className="text-base font-bold">Study Materials</h2>
          <p className={cls('text-xs mt-0.5', sub)}>Full folder & file management for every department</p>
        </div>
        <button onClick={loadFolders} className={cls('p-2 rounded-lg border', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-100')} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Section tabs: Folders vs Drive Config */}
      <div className={cls('flex border-b', border, dk ? 'bg-[#16181c]/20' : 'bg-slate-50/40')}>
        {(['folders', 'drive', 'departments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cls(
              'flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors',
              activeTab === tab
                ? 'border-blue-500 text-blue-500'
                : cls('border-transparent', dk ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'),
            )}
          >
            {tab === 'folders' ? <><FolderOpen size={13} /> Folders & Files</>
              : tab === 'drive' ? <><Link size={13} /> Drive Config</>
              : <><Link size={13} /> Department Config</>}
          </button>
        ))}
      </div>

      {/* Drive Config panel */}
      {activeTab === 'drive' && (
        <div className="p-5 space-y-4">
          <p className={cls('text-xs', sub)}>
            Set the Google Drive folder ID for each major. Students will browse that folder in real-time.
            Copy the folder ID from the Drive URL: <code className="font-mono bg-slate-500/20 px-1 rounded">https://drive.google.com/drive/folders/<strong>FOLDER_ID</strong></code>
          </p>
          {/* Live preview */}
          <div className={cls('rounded-xl border overflow-hidden', border)}>
            <div className={cls('px-4 py-2 border-b text-xs font-semibold', border, sub)}>LIVE PREVIEW (what students see)</div>
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>}>
              <GDriveBrowserLazy userMajor={null} isDarkMode={dk} onPreviewFile={() => {}} />
            </Suspense>
          </div>

          {MAJORS.map(m => {
            const key = String(m.value);
            const edit = driveEditing[key] ?? { folderId: '', label: m.label };
            const isSaving = driveSaving === key;
            const currentConfig = driveConfigs.find(c => c.major === m.value);
            return (
              <div key={key} className={cls('rounded-xl border p-4 space-y-3', border, dk ? 'bg-[#16181c]/40' : 'bg-white')}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.emoji}</span>
                  <span className="text-sm font-semibold">{m.label}</span>
                  {currentConfig && (
                    <span className={cls('text-xs px-2 py-0.5 rounded-full ml-auto', dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')}>
                      Configured
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Drive Folder ID (e.g. 1lFktSbOz-voVmiSnYJzuHbtSfpeqsuAx)"
                    value={edit.folderId}
                    onChange={e => setDriveEditing(prev => ({ ...prev, [key]: { ...edit, folderId: e.target.value } }))}
                    className={input}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={edit.label}
                      onChange={e => setDriveEditing(prev => ({ ...prev, [key]: { ...edit, label: e.target.value } }))}
                      className={cls(input, 'flex-1')}
                    />
                    <button
                      disabled={!edit.folderId.trim() || isSaving}
                      onClick={async () => {
                        if (!edit.folderId.trim()) return;
                        setDriveSaving(key);
                        await upsertDriveConfig(m.value, edit.folderId.trim(), edit.label || m.label, currentUserId);
                        await loadDriveConfigs();
                        setDriveSaving(null);
                      }}
                      className={cls(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                        edit.folderId.trim() && !isSaving
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed',
                      )}
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save
                    </button>
                  </div>
                  {currentConfig && (
                    <a
                      href={`https://drive.google.com/drive/folders/${currentConfig.folder_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Link size={11} /> Open in Drive
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Department Config panel (Department -> Semester -> Course hierarchy) */}
      {activeTab === 'departments' && (
        <div className="p-5 space-y-4">
          <p className={cls('text-xs', sub)}>
            Set the Google Drive root folder for each department. That folder should contain
            Semester 1-12 subfolders, each containing course folders, each containing Mid-term/Final-term subfolders.
            Copy the folder ID from the Drive URL: <code className="font-mono bg-slate-500/20 px-1 rounded">https://drive.google.com/drive/folders/<strong>FOLDER_ID</strong></code>
          </p>

          {DEPARTMENTS.map(d => {
            const edit = departmentEditing[d.key] ?? { folderId: '', label: d.label };
            const isSaving = departmentSaving === d.key;
            const currentConfig = departmentConfigs.find(c => c.department === d.key);
            return (
              <div key={d.key} className={cls('rounded-xl border p-4 space-y-3', border, dk ? 'bg-[#16181c]/40' : 'bg-white')}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{d.label}</span>
                  {!d.active && (
                    <span className={cls('text-xs px-2 py-0.5 rounded-full', dk ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')}>
                      Coming Soon
                    </span>
                  )}
                  {currentConfig && (
                    <span className={cls('text-xs px-2 py-0.5 rounded-full ml-auto', dk ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700')}>
                      Configured
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Drive Folder ID (e.g. 1lFktSbOz-voVmiSnYJzuHbtSfpeqsuAx)"
                    value={edit.folderId}
                    onChange={e => setDepartmentEditing(prev => ({ ...prev, [d.key]: { ...edit, folderId: e.target.value } }))}
                    className={input}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={edit.label}
                      onChange={e => setDepartmentEditing(prev => ({ ...prev, [d.key]: { ...edit, label: e.target.value } }))}
                      className={cls(input, 'flex-1')}
                    />
                    <button
                      disabled={!edit.folderId.trim() || isSaving}
                      onClick={async () => {
                        if (!edit.folderId.trim()) return;
                        setDepartmentSaving(d.key);
                        await upsertDepartmentConfig(d.key, edit.folderId.trim(), edit.label || d.label, currentUserId);
                        await loadDepartmentConfigs();
                        setDepartmentSaving(null);
                      }}
                      className={cls(
                        'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                        edit.folderId.trim() && !isSaving
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed',
                      )}
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save
                    </button>
                  </div>
                  {currentConfig && (
                    <a
                      href={`https://drive.google.com/drive/folders/${currentConfig.folder_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Link size={11} /> Open in Drive
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drive admin panel (folders tab) */}
      {activeTab === 'folders' && <div className="min-h-[520px] flex flex-col">
        <Suspense fallback={<div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-blue-500" /></div>}>
          <AdminDrivePanelLazy isDarkMode={dk} onPreviewFile={onPreviewFile} />
        </Suspense>
      </div>}

      {/* Old Supabase two-panel layout — HIDDEN, kept for reference */}
      {false && <div className="flex min-h-[520px]">

        {/* Left: folder tree */}
        <div className={cls('w-56 flex-shrink-0 border-r flex flex-col', border)}>
          <div className={cls('flex items-center justify-between px-3 py-2 border-b text-xs font-semibold', border, sub)}>
            <span>FOLDERS</span>
            <button
              onClick={() => { setCreateParent(null); setShowCreateFolder(true); }}
              className={cls('flex items-center gap-1 px-2 py-1 rounded-md text-blue-500 hover:bg-blue-500/10')}
            >
              <Plus size={12} /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {loadingFolders ? (
              <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-500" /></div>
            ) : tree.length === 0 ? (
              <div className={cls('text-center py-8 px-2 text-xs', sub)}>
                No folders yet.<br />Click New to create one.
              </div>
            ) : (
              tree.map(f => (
                <TreeNode
                  key={f.id}
                  folder={f}
                  depth={0}
                  selectedId={selectedFolder?.id ?? null}
                  onSelect={setSelectedFolder}
                  onAddChild={parent => { setCreateParent(parent); setShowCreateFolder(true); }}
                  onRename={f => { setRenameFolder(f); setRenameName(f.name); }}
                  onDelete={f => setDeleteTarget({ type: 'folder', item: f })}
                  isDarkMode={dk}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: files panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedFolder ? (
            <div className={cls('flex-1 flex flex-col items-center justify-center gap-3 text-center px-6', sub)}>
              <Folder size={40} className="opacity-30" />
              <p className="text-sm font-medium">Select a folder to view its files</p>
              <p className="text-xs opacity-70">or create a new folder in the panel on the left</p>
            </div>
          ) : (
            <>
              {/* File panel header */}
              <div className={cls('flex items-center justify-between px-4 py-3 border-b', border)}>
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: selectedFolder.color }}><FolderOpen size={16} /></span>
                  <span className="font-semibold truncate">{selectedFolder.name}</span>
                  <span className={cls('text-xs px-1.5 py-0.5 rounded-full', dk ? 'bg-[#2f3336] text-slate-400' : 'bg-slate-100 text-slate-500')}>
                    {materials.length} file{materials.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                  >
                    <Upload size={13} /> Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && addFiles(e.target.files)}
                  />
                </div>
              </div>

              {/* Upload queue */}
              {hasUploads && (
                <div className={cls('border-b px-4 py-3 space-y-2', border, dk ? 'bg-[#16181c]/50' : 'bg-blue-50/50')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Upload queue</span>
                    <div className="flex gap-2">
                      {pendingUploads.length > 0 && (
                        <button onClick={runUploads} className="text-xs px-2 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">
                          Upload {pendingUploads.length} file{pendingUploads.length > 1 ? 's' : ''}
                        </button>
                      )}
                      <button onClick={() => setUploadItems([])} className={cls('text-xs px-2 py-1 rounded', dk ? 'bg-[#2f3336] hover:bg-[#38444d]' : 'bg-slate-200 hover:bg-slate-300')}>
                        Clear
                      </button>
                    </div>
                  </div>
                  {uploadItems.map((u, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-base">{fileIcon(u.file.type)}</span>
                      <div className="flex-1 min-w-0">
                        <input
                          value={u.title}
                          onChange={e => setUploadItems(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                          className={cls('w-full text-xs px-2 py-1 rounded border', border, dk ? 'bg-[#2f3336] text-white' : 'bg-white text-slate-900')}
                          disabled={u.status !== 'pending'}
                        />
                        {u.status === 'uploading' && (
                          <div className={cls('mt-1 h-1 rounded-full overflow-hidden', dk ? 'bg-[#2f3336]' : 'bg-slate-200')}>
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${u.progress}%` }} />
                          </div>
                        )}
                      </div>
                      <span className={cls('text-xs flex-shrink-0 font-medium',
                        u.status === 'done' ? 'text-green-500' :
                        u.status === 'error' ? 'text-red-400' :
                        u.status === 'uploading' ? 'text-blue-400' : sub
                      )}>
                        {u.status === 'done' ? '✓' : u.status === 'error' ? '✗' : u.status === 'uploading' ? `${u.progress}%` : formatFileSize(u.file.size)}
                      </span>
                      {u.status === 'pending' && (
                        <button onClick={() => setUploadItems(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-500">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone + file list */}
              <div
                className={cls('flex-1 overflow-y-auto p-4', isDragging && (dk ? 'bg-blue-900/20 ring-2 ring-blue-500 ring-inset' : 'bg-blue-50 ring-2 ring-blue-400 ring-inset'))}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {loadingMaterials ? (
                  <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
                ) : materials.length === 0 ? (
                  <div className={cls('flex flex-col items-center justify-center py-12 text-center', sub)}>
                    <Upload size={32} className="opacity-30 mb-3" />
                    <p className="text-sm font-medium">No files yet</p>
                    <p className="text-xs mt-1">Drag & drop files here or click Upload</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materials.map(m => (
                      <div
                        key={m.id}
                        className={cls(
                          'group flex items-center gap-3 p-3 rounded-xl border transition-colors',
                          dk ? 'border-[#2f3336] bg-[#16181c]/50 hover:border-[#38444d]' : 'border-slate-200 bg-white hover:border-slate-300',
                        )}
                      >
                        <span className="text-xl flex-shrink-0">{fileIcon(m.file_type)}</span>
                        <div className="flex-1 min-w-0">
                          {renamingMaterial === m.id ? (
                            <div className="flex gap-1">
                              <input
                                autoFocus
                                value={renameMaterialName}
                                onChange={e => setRenameMaterialName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameMaterial(m.id); if (e.key === 'Escape') setRenamingMaterial(null); }}
                                className={cls('flex-1 text-sm px-2 py-0.5 rounded border', border, dk ? 'bg-[#2f3336] text-white' : 'bg-white text-slate-900')}
                              />
                              <button onClick={() => handleRenameMaterial(m.id)} className="text-green-500"><Check size={14} /></button>
                              <button onClick={() => setRenamingMaterial(null)} className="text-red-400"><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium truncate">{m.title}</p>
                          )}
                          <p className={cls('text-xs', sub)}>
                            {formatFileSize(m.file_size)}
                            {m.file_size ? ' · ' : ''}
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                          {onPreviewFile && (
                            <button onClick={() => onPreviewFile(m.file_url, m.title)} className={cls('p-1.5 rounded-lg', dk ? 'hover:bg-[#38444d] text-slate-400' : 'hover:bg-slate-100 text-slate-500')} title="Preview">
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setRenamingMaterial(m.id); setRenameMaterialName(m.title); }}
                            className={cls('p-1.5 rounded-lg', dk ? 'hover:bg-[#38444d] text-slate-400' : 'hover:bg-slate-100 text-slate-500')}
                            title="Rename"
                          ><Edit2 size={14} /></button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'material', item: m })}
                            className={cls('p-1.5 rounded-lg text-red-400', dk ? 'hover:bg-red-900/30' : 'hover:bg-red-50')}
                            title="Delete"
                          ><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>}

      {/* ── Modal: Create folder ───────────────────────────────────────── */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cls('w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4', surface, border)}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                {createParent ? `New subfolder in "${createParent.name}"` : `New folder · ${majorMeta.label}`}
              </h3>
              <button onClick={() => setShowCreateFolder(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                className={input}
              />
              <div>
                <p className={cls('text-xs mb-2', sub)}>Color</p>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      className={cls('w-7 h-7 rounded-full border-2 transition-transform', newFolderColor === c ? 'border-white scale-110' : 'border-transparent')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowCreateFolder(false)} className={cls('px-4 py-2 rounded-lg text-sm border', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-50')}>Cancel</button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || savingFolder}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingFolder && <Loader2 size={14} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Rename folder ───────────────────────────────────────── */}
      {renameFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cls('w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4', surface, border)}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Rename folder</h3>
              <button onClick={() => setRenameFolder(null)}><X size={16} /></button>
            </div>
            <input
              autoFocus
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameFolder()}
              className={input}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenameFolder(null)} className={cls('px-4 py-2 rounded-lg text-sm border', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-50')}>Cancel</button>
              <button onClick={handleRenameFolder} disabled={!renameName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete confirm ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={cls('w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4', surface, border)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete {deleteTarget.type === 'folder' ? 'folder' : 'file'}?</h3>
                <p className={cls('text-sm', sub)}>
                  "{deleteTarget.type === 'folder' ? (deleteTarget.item as StudyFolder).name : (deleteTarget.item as StudyMaterial).title}"
                  {deleteTarget.type === 'folder' && <> and all its contents will be permanently deleted.</>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteTarget(null)} className={cls('px-4 py-2 rounded-lg text-sm border', border, dk ? 'hover:bg-[#2f3336]' : 'hover:bg-slate-50')}>Cancel</button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
