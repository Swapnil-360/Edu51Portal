import { supabase } from '../supabase';

export type StudyMajor = 'AI' | 'Software Engineering' | 'Networking' | null;

export interface StudyFolder {
  id: string;
  name: string;
  parent_id: string | null;
  major: StudyMajor;
  color: string;
  order_index: number;
  created_by: string | null;
  created_at: string;
  // populated client-side
  children?: StudyFolder[];
  materialCount?: number;
}

export interface StudyMaterial {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Folders ───────────────────────────────────────────────────────────

export async function listAllFolders(): Promise<StudyFolder[]> {
  const { data, error } = await supabase
    .from('study_folders')
    .select('*')
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data as StudyFolder[];
}

export async function createFolder(
  name: string,
  major: StudyMajor,
  parentId: string | null,
  color: string,
  createdBy: string,
): Promise<StudyFolder | null> {
  const { data, error } = await supabase
    .from('study_folders')
    .insert({ name, major, parent_id: parentId, color, created_by: createdBy })
    .select()
    .single();
  if (error || !data) return null;
  return data as StudyFolder;
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<StudyFolder, 'name' | 'color' | 'order_index'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('study_folders')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function deleteFolder(id: string): Promise<boolean> {
  // Materials cascade via FK; storage files cleaned up separately
  const { error } = await supabase.from('study_folders').delete().eq('id', id);
  return !error;
}

// ── Materials ─────────────────────────────────────────────────────────

export async function listMaterials(folderId: string): Promise<StudyMaterial[]> {
  const { data, error } = await supabase
    .from('study_materials')
    .select('*')
    .eq('folder_id', folderId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as StudyMaterial[];
}

export async function uploadMaterial(
  folderId: string,
  file: File,
  title: string,
  description: string,
  createdBy: string,
  onProgress?: (pct: number) => void,
): Promise<StudyMaterial | null> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const fileId = crypto.randomUUID();
  const filePath = `${folderId}/${fileId}.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('study-materials')
    .upload(filePath, file, { upsert: false });
  if (uploadError) return null;
  if (onProgress) onProgress(80);

  const { data: urlData } = supabase.storage
    .from('study-materials')
    .getPublicUrl(filePath);

  // Insert DB row
  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      folder_id: folderId,
      title: title.trim() || file.name,
      description: description.trim() || null,
      file_url: urlData.publicUrl,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      created_by: createdBy,
    })
    .select()
    .single();
  if (onProgress) onProgress(100);
  if (error || !data) return null;
  return data as StudyMaterial;
}

export async function updateMaterial(
  id: string,
  updates: Partial<Pick<StudyMaterial, 'title' | 'description' | 'order_index'>>,
): Promise<boolean> {
  const { error } = await supabase
    .from('study_materials')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteMaterial(id: string, filePath: string): Promise<boolean> {
  await supabase.storage.from('study-materials').remove([filePath]);
  const { error } = await supabase.from('study_materials').delete().eq('id', id);
  return !error;
}

// ── Helpers ───────────────────────────────────────────────────────────

export function buildFolderTree(flat: StudyFolder[]): StudyFolder[] {
  const map = new Map<string, StudyFolder>();
  flat.forEach(f => map.set(f.id, { ...f, children: [] }));
  const roots: StudyFolder[] = [];
  map.forEach(f => {
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children!.push(f);
    } else {
      roots.push(f);
    }
  });
  return roots;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('text/')) return '📃';
  return '📄';
}

export const MAJORS: { label: string; value: StudyMajor; emoji: string; color: string }[] = [
  { label: 'Common', value: null, emoji: '🌐', color: '#6366f1' },
  { label: 'AI', value: 'AI', emoji: '🤖', color: '#f59e0b' },
  { label: 'Software Eng', value: 'Software Engineering', emoji: '💻', color: '#3b82f6' },
  { label: 'Networking', value: 'Networking', emoji: '🌐', color: '#10b981' },
];

export const FOLDER_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b',
  '#10b981', '#ef4444', '#ec4899', '#06b6d4',
];

// ── Drive Config ──────────────────────────────────────────────────────

export interface DriveConfig {
  id: string;
  major: StudyMajor;
  folder_id: string;
  label: string | null;
  updated_at: string;
}

export async function listDriveConfigs(): Promise<DriveConfig[]> {
  const { data, error } = await supabase
    .from('study_drive_config')
    .select('*')
    .order('major', { ascending: true, nullsFirst: true });
  if (error || !data) return [];
  return data as DriveConfig[];
}

export async function upsertDriveConfig(
  major: StudyMajor,
  folderId: string,
  label: string,
  updatedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('study_drive_config')
    .upsert({ major, folder_id: folderId, label, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'major' });
  return !error;
}

export async function getDriveConfigForMajor(major: StudyMajor): Promise<string | null> {
  const query = supabase.from('study_drive_config').select('folder_id');
  const { data } = await (major === null
    ? query.is('major', null)
    : query.eq('major', major)
  ).maybeSingle();
  return data?.folder_id ?? null;
}

// ── Department Drive Config (Department -> Semester -> Course -> Mid/Final) ──

export interface DepartmentConfig {
  id: string;
  department: string;
  folder_id: string;
  label: string | null;
  updated_at: string;
}

export async function listDepartmentConfigs(): Promise<DepartmentConfig[]> {
  const { data, error } = await supabase
    .from('study_department_config')
    .select('*')
    .order('department', { ascending: true });
  if (error || !data) return [];
  return data as DepartmentConfig[];
}

export async function upsertDepartmentConfig(
  department: string,
  folderId: string,
  label: string,
  updatedBy: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('study_department_config')
    .upsert({ department, folder_id: folderId, label, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'department' });
  return !error;
}

export async function getDriveConfigForDepartment(department: string): Promise<string | null> {
  const { data } = await supabase
    .from('study_department_config')
    .select('folder_id')
    .eq('department', department)
    .maybeSingle();
  return data?.folder_id ?? null;
}
