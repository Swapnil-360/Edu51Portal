import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight, Loader2, FolderOpen } from 'lucide-react';

export interface SemesterFolder {
  id: string;
  name: string;
  semesterNumber: number | null;
}

interface SemesterFolderBrowserProps {
  rootFolderId: string;
  isDarkMode?: boolean;
  onSemesterSelect: (semester: SemesterFolder) => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

function cls(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(' '); }

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};

/** Extracts a semester number from a folder name — handles both digits
 * ("Semester 3") and English ordinal words ("Third Semester"). */
function parseSemesterNumber(name: string): number | null {
  const digitMatch = name.match(/\d+/);
  if (digitMatch) return parseInt(digitMatch[0], 10);

  const lower = name.toLowerCase();
  for (const [word, num] of Object.entries(ORDINAL_WORDS)) {
    if (lower.includes(word)) return num;
  }
  return null;
}

/** Clean display label — normalized to "Semester 01" style regardless of how
 * the underlying Drive folder is actually named, so renaming folders in Drive
 * is never required to get a consistent look. */
function displayLabel(sem: SemesterFolder): string {
  return sem.semesterNumber != null ? `Semester ${String(sem.semesterNumber).padStart(2, '0')}` : sem.name;
}

/** Lists a department's root Drive folder's subfolders as Semester 1-12 cards. */
export const SemesterFolderBrowser: React.FC<SemesterFolderBrowserProps> = ({
  rootFolderId, isDarkMode: dk = false, onSemesterSelect,
}) => {
  const [semesters, setSemesters] = useState<SemesterFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [rootFolderId]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const q = encodeURIComponent(`'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=files(id,name)&pageSize=50`);
      if (!res.ok) throw new Error();
      const { files = [] } = await res.json();
      const found: SemesterFolder[] = files
        .map((f: any) => ({ id: f.id, name: f.name, semesterNumber: parseSemesterNumber(f.name) }))
        .sort((a: SemesterFolder, b: SemesterFolder) => (a.semesterNumber ?? 999) - (b.semesterNumber ?? 999));
      setSemesters(found);
      if (found.length === 0) setError('No semester folders found in this Google Drive folder.');
    } catch {
      setError('Failed to load semesters. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className={cls('h-6 w-6 animate-spin', dk ? 'text-slate-500' : 'text-slate-400')} />
      <p className={cls('text-sm', dk ? 'text-slate-500' : 'text-slate-400')}>Loading semesters…</p>
    </div>
  );

  if (error) return (
    <div className={cls('rounded-xl p-5 border flex items-start gap-3', dk ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-200')}>
      <AlertCircle className={cls('h-4 w-4 mt-0.5 flex-shrink-0', dk ? 'text-red-400' : 'text-red-500')} />
      <div>
        <p className={cls('text-sm mb-2', dk ? 'text-red-300' : 'text-red-700')}>{error}</p>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {semesters.map((sem) => (
        <button
          key={sem.id}
          onClick={() => onSemesterSelect(sem)}
          className={cls(
            'group relative text-left rounded-2xl border overflow-hidden transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            dk
              ? 'bg-[#16181c]/70 border-[#2f3336]/80 hover:border-[#38444d] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/80',
          )}
        >
          {/* Top accent stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-[#1e9df1] to-[#1677cc]" />

          <div className="p-4 sm:p-5 flex flex-col items-center text-center gap-2.5">
            <div
              className={cls(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
                dk ? 'bg-[#1e9df1]/10' : 'bg-[#e8f4fd]',
              )}
            >
              <FolderOpen className={cls('h-6 w-6', dk ? 'text-[#1e9df1]' : 'text-[#1677cc]')} strokeWidth={1.75} />
            </div>

            <div>
              <p className={cls('text-[10px] font-bold uppercase tracking-widest', dk ? 'text-slate-500' : 'text-slate-400')}>
                Semester
              </p>
              <p className={cls('text-2xl font-black leading-tight', dk ? 'text-[#e7e9ea]' : 'text-slate-900')}>
                {sem.semesterNumber != null ? String(sem.semesterNumber).padStart(2, '0') : displayLabel(sem)}
              </p>
            </div>

            <div className={cls('flex items-center gap-1 text-[11px] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200', dk ? 'text-[#1e9df1]' : 'text-[#1677cc]')}>
              Browse
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
