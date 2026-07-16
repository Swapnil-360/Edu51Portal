import { supabase } from '../supabase';
import type { TeamFile } from '../../types/social';
import { sanitizeIlikeTerm } from '../sanitize';

const PROFILE_COLS = 'id,name,avatar_url,profile_pic';

// Module-level cache for the public files feed (5-minute TTL)
let _publicFilesCache: { data: TeamFile[]; ts: number } | null = null;
const PUBLIC_FILES_TTL = 5 * 60 * 1000;

export async function listTeamFiles(teamId: string): Promise<TeamFile[]> {
  const { data, error } = await supabase
    .from('team_files')
    .select(`*, uploader:profiles!uploader_id(${PROFILE_COLS})`)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });
  if (error) { console.error('listTeamFiles', error); return []; }
  return (data ?? []) as TeamFile[];
}

export type PublicFilesSort = 'recent' | 'oldest' | 'name_asc' | 'name_desc';

export interface ListPublicFilesOptions {
  search?: string;
  sort?: PublicFilesSort;
}

const SORT_COLUMNS: Record<PublicFilesSort, { column: 'created_at' | 'name'; ascending: boolean }> = {
  recent: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  name_asc: { column: 'name', ascending: true },
  name_desc: { column: 'name', ascending: false },
};

export async function listPublicFiles(
  limit = 40,
  offset = 0,
  options: ListPublicFilesOptions = {},
): Promise<TeamFile[]> {
  const search = options.search?.trim() || '';
  const sort = options.sort ?? 'recent';
  const isDefaultView = !search && sort === 'recent';

  // Serve from cache for first-page requests of the default (unsearched, recent) view.
  if (isDefaultView && offset === 0 && _publicFilesCache && Date.now() - _publicFilesCache.ts < PUBLIC_FILES_TTL) {
    return _publicFilesCache.data;
  }

  let query = supabase
    .from('team_files')
    .select(`id,name,file_url,file_type,file_size,created_at,team_id,uploader_id,visibility,uploader:profiles!uploader_id(${PROFILE_COLS}),team:teams!team_id(id,name,logo_url)`)
    .eq('visibility', 'public');

  if (search) {
    query = query.ilike('name', `%${sanitizeIlikeTerm(search)}%`);
  }

  const { column, ascending } = SORT_COLUMNS[sort];
  query = query.order(column, { ascending }).range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) { console.error('listPublicFiles', error); return []; }
  const result = (data ?? []) as TeamFile[];
  if (isDefaultView && offset === 0) _publicFilesCache = { data: result, ts: Date.now() };
  return result;
}

export function invalidatePublicFilesCache() {
  _publicFilesCache = null;
}

export async function uploadTeamFile(
  teamId: string,
  uploaderId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<TeamFile | null> {
  const fileId = crypto.randomUUID();
  const ext = extFromMime(file.type);
  const filePath = `${teamId}/${fileId}.${ext}`;

  const { error: storageErr } = await supabase.storage
    .from('team-files')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
      onUploadProgress: (p) => onProgress?.(Math.round((p.loaded / p.total) * 100)),
    });
  if (storageErr) { console.error('uploadTeamFile storage', storageErr); return null; }

  const { data: urlData } = supabase.storage.from('team-files').getPublicUrl(filePath);
  const fileUrl = urlData.publicUrl;

  const { data, error: dbErr } = await supabase
    .from('team_files')
    .insert({
      id: fileId,
      team_id: teamId,
      uploader_id: uploaderId,
      name: file.name,
      file_path: filePath,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      visibility: 'private',
    })
    .select(`*, uploader:profiles!uploader_id(${PROFILE_COLS})`)
    .single();

  if (dbErr) {
    console.error('uploadTeamFile db', dbErr);
    await supabase.storage.from('team-files').remove([filePath]);
    return null;
  }
  return data as TeamFile;
}

export async function deleteTeamFile(fileId: string, filePath: string): Promise<void> {
  await supabase.storage.from('team-files').remove([filePath]);
  const { error } = await supabase.from('team_files').delete().eq('id', fileId);
  if (error) console.error('deleteTeamFile', error);
}

export async function setFileVisibility(
  fileId: string,
  visibility: 'private' | 'public'
): Promise<void> {
  const { error } = await supabase
    .from('team_files')
    .update({ visibility })
    .eq('id', fileId);
  if (error) console.error('setFileVisibility', error);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  return map[mime] ?? 'bin';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileTypeLabel(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
  };
  return map[mime] ?? 'File';
}

export const ACCEPTED_MIME =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp';
