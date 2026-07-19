import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight, BookOpen } from 'lucide-react';
import ChipLoader from '../ui/ChipLoader';

interface GDriveCourse {
  id: string;
  name: string;
  code: string;
  description: string;
  folderId: string;
  folderLink: string;
  major: string;
}

interface GDriveFolderBrowserProps {
  rootFolderId: string;
  sectionLabel?: string;
  accentColor?: string;
  isDarkMode?: boolean;
  onCourseSelect?: (course: GDriveCourse) => void;
  onReady?: () => void;
}

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DEFAULT_ACCENT = '#1e9df1';

function cls(...a: (string | false | null | undefined)[]) { return a.filter(Boolean).join(' '); }

/** Lists the direct Drive subfolders of `rootFolderId` as clickable course cards. */
export const GDriveFolderBrowser: React.FC<GDriveFolderBrowserProps> = ({
  rootFolderId, sectionLabel, accentColor = DEFAULT_ACCENT, isDarkMode: dk = false, onCourseSelect, onReady,
}) => {
  const [courses, setCourses] = useState<GDriveCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { loadCourses(); }, [rootFolderId]);

  const loadCourses = async () => {
    setLoading(true); setError(null);
    try {
      const found = rootFolderId ? await listFolders(rootFolderId) : [];
      setCourses(found);
      if (found.length > 0) onReady?.();
      if (found.length === 0) setError('No courses found in this Google Drive folder.');
    } catch {
      setError('Failed to load courses. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const listFolders = async (parentId: string): Promise<GDriveCourse[]> => {
    try {
      const q = encodeURIComponent(`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=files(id,name,webViewLink)&pageSize=50`);
      if (!res.ok) throw new Error();
      const { files = [] } = await res.json();
      return files.map((f: any) => ({
        id: f.id, name: f.name,
        code: f.name.split('(')[0].trim(),
        description: sectionLabel ? `${sectionLabel} Course` : 'Course',
        folderId: f.id, folderLink: f.webViewLink, major: sectionLabel ?? '',
      }));
    } catch { return []; }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <ChipLoader size="lg" />
      <p className={cls('text-sm', dk ? 'text-slate-500' : 'text-slate-400')}>Loading courses…</p>
    </div>
  );

  if (error) return (
    <div className={cls('rounded-xl p-5 border flex items-start gap-3', dk ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-200')}>
      <AlertCircle className={cls('h-4 w-4 mt-0.5 flex-shrink-0', dk ? 'text-red-400' : 'text-red-500')} />
      <div>
        <p className={cls('text-sm mb-2', dk ? 'text-red-300' : 'text-red-700')}>{error}</p>
        <button onClick={loadCourses} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors">Retry</button>
      </div>
    </div>
  );

  if (courses.length === 0) return (
    <div className={cls('rounded-xl border p-10 text-center', dk ? 'bg-[#16181c]/40 border-[#2f3336]' : 'bg-slate-50 border-slate-200')}>
      <BookOpen className={cls('h-10 w-10 mx-auto mb-3 opacity-20', dk ? 'text-[#8b98a5]' : 'text-slate-700')} />
      <p className={cls('text-sm font-medium', dk ? 'text-slate-400' : 'text-slate-500')}>No courses available yet</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <button
          key={course.id}
          onClick={() => onCourseSelect?.(course)}
          className={cls(
            'group relative text-left rounded-xl border overflow-hidden transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            dk
              ? 'bg-[#16181c]/70 border-[#2f3336]/80 hover:border-[#38444d] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80',
          )}
        >
          {/* Left accent stripe */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: accentColor }} />

          <div className="pl-5 pr-5 pt-5 pb-4">
            {/* Top row: icon + section badge */}
            <div className="flex items-center justify-between mb-4">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg"
                style={{ background: `${accentColor}18` }}
              >
                <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
              </div>
              {sectionLabel && (
                <span className={cls('px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide', dk ? 'bg-[#2f3336] text-slate-400' : 'bg-slate-100 text-slate-500')}>
                  {sectionLabel}
                </span>
              )}
            </div>

            {/* Course name — plain, no gradient */}
            <h3 className={cls('font-semibold text-[15px] leading-snug mb-1.5 group-hover:text-[var(--accent)] transition-colors duration-150', dk ? 'text-[#e7e9ea]' : 'text-slate-900')}
              style={{ '--accent': accentColor } as React.CSSProperties}
            >
              {course.name}
            </h3>

            <p className={cls('text-xs mb-4', dk ? 'text-slate-500' : 'text-slate-400')}>{course.description}</p>

            {/* Divider */}
            <div className={cls('h-px mb-3', dk ? 'bg-[#2f3336]/60' : 'bg-slate-100')} />

            {/* CTA */}
            <div className={cls('flex items-center justify-between text-xs font-medium', dk ? 'text-slate-400' : 'text-slate-500')}>
              <span>View Materials</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
