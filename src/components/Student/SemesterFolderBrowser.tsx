import React, { useState, useEffect } from 'react';
import { AlertCircle, FolderOpen } from 'lucide-react';
import { FolderCard } from '../ui/folder-card';
import ChipLoader from '../ui/ChipLoader';

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
      <ChipLoader size="lg" />
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

  const VARIANTS: Array<'default' | 'project' | 'system'> = ['default', 'project', 'system'];
  const ICON_COLORS: Record<typeof VARIANTS[number], string> = {
    default: 'text-purple-600 dark:text-purple-400',
    project: 'text-fuchsia-600 dark:text-fuchsia-400',
    system: 'text-cyan-600 dark:text-cyan-400',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {semesters.map((sem, i) => {
        const variant = VARIANTS[Math.floor(i / 4) % VARIANTS.length];
        return (
        <FolderCard
          key={sem.id}
          variant={variant}
          icon={<FolderOpen className={cls('h-8 w-8', ICON_COLORS[variant])} strokeWidth={1.75} />}
          title={sem.semesterNumber != null ? `Semester ${String(sem.semesterNumber).padStart(2, '0')}` : displayLabel(sem)}
          size="Browse course materials"
          role="button"
          tabIndex={0}
          onClick={() => onSemesterSelect(sem)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSemesterSelect(sem); }
          }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(i * 0.04, 0.4) }}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        />
        );
      })}
    </div>
  );
};
