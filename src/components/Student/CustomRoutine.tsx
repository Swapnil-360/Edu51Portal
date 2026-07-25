import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle, Save, Clock, MapPin, Download, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import Loader from '../ui/Loader';

export type RoutineType = 'regular' | 'improvement' | 'retake';

type ClassMode = 'theory' | 'lab';
type Day = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

interface RoutineEntry {
  id: string;
  title: string;
  courseCode?: string;
  type: RoutineType;
  mode: ClassMode;
  day: Day;
  start: string;
  end: string;
  room?: string;
  section?: string;
  teacher?: string;
  linkedTo?: string;
  createdAt: number;
}

interface CustomRoutineProps {
  onClose: () => void;
  isDarkMode: boolean;
  userId?: string;
}

const ALL_DAYS: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const END_TIME = '22:00';
const START_TIME = '07:00';
const START_MINUTES = toMinutes(START_TIME);
const END_MINUTES = toMinutes(END_TIME);
const SLOT_MINUTES = 90;
const BREAK_START = '12:45';
const BREAK_END = '13:15';

const format12h = (hhmm: string) => {
  const [hRaw, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(m)) return hhmm;
  const suffix = hRaw >= 12 ? 'PM' : 'AM';
  const h12 = ((hRaw + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmt2(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function fmtSlotRange(mStart: number, mEnd: number): string {
  const h1 = Math.floor(mStart / 60) % 12 || 12;
  const h2 = Math.floor(mEnd / 60) % 12 || 12;
  const m1 = mStart % 60;
  const m2 = mEnd % 60;
  const t1 = m1 ? `${h1}:${String(m1).padStart(2, '0')}` : `${h1}`;
  const t2 = m2 ? `${h2}:${String(m2).padStart(2, '0')}` : `${h2}`;
  return `${t1}–${t2}`;
}

// Note text stays comfortably large when short, shrinks only as it grows
function noteFontSize(text: string): number {
  const len = (text || '').length;
  if (len > 120) return 10;
  if (len > 70) return 11;
  return 12.5;
}

function overlaps(a: RoutineEntry, b: RoutineEntry): boolean {
  if (a.day !== b.day) return false;
  const s1 = toMinutes(a.start); const e1 = toMinutes(a.end);
  const s2 = toMinutes(b.start); const e2 = toMinutes(b.end);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

function enforceOverlapConstraints(entries: RoutineEntry[]): RoutineEntry[] {
  const byDay: Record<Day, RoutineEntry[]> = { Sun: [], Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] };
  entries.forEach(e => byDay[e.day].push(e));
  const kept: RoutineEntry[] = [];
  (Object.keys(byDay) as Day[]).forEach(day => {
    const dayEntries = byDay[day].slice().sort((a, b) => {
      const diff = toMinutes(a.start) - toMinutes(b.start);
      return diff !== 0 ? diff : a.createdAt - b.createdAt;
    });
    const active: RoutineEntry[] = [];
    dayEntries.forEach(entry => {
      const start = toMinutes(entry.start);
      for (let i = active.length - 1; i >= 0; i--) {
        if (toMinutes(active[i].end) <= start) active.splice(i, 1);
      }
      const overlapping = active.filter(a => toMinutes(a.end) > start);
      const regularCount = overlapping.filter(e => e.type === 'regular').length + (entry.type === 'regular' ? 1 : 0);
      const nonRegularCount = overlapping.filter(e => e.type !== 'regular').length + (entry.type !== 'regular' ? 1 : 0);
      const total = overlapping.length + 1;
      if (total > 2) return;
      if (entry.type === 'regular' && regularCount > 1) return;
      if (entry.type !== 'regular' && nonRegularCount > 1) return;
      active.push(entry);
      kept.push(entry);
    });
  });
  return kept;
}

export default function CustomRoutine({ onClose, isDarkMode: dk, userId }: CustomRoutineProps) {
  const storageKey = `userRoutineEntries_${userId || 'anon'}`;

  const [entries, setEntries] = useState<RoutineEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return enforceOverlapConstraints(JSON.parse(raw) as RoutineEntry[]);
    } catch { /* ignore */ }
    return [];
  });

  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      if (!supabaseConfigured || !userId) { setIsLoadingFromDb(false); return; }
      try {
        const { data, error } = await supabase
          .from('user_routines')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          const loaded: RoutineEntry[] = data.map((row: any) => ({
            id: row.entry_id,
            title: row.title,
            courseCode: row.course_code || undefined,
            type: row.type as RoutineType,
            mode: row.mode as ClassMode,
            day: row.day as Day,
            start: row.start_time,
            end: row.end_time,
            room: row.room || undefined,
            section: row.section || undefined,
            teacher: row.teacher || undefined,
            linkedTo: row.linked_to || undefined,
            createdAt: new Date(row.created_at).getTime(),
          }));
          const sanitized = enforceOverlapConstraints(loaded);
          setEntries(sanitized);
          try { localStorage.setItem(storageKey, JSON.stringify(sanitized)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('CustomRoutine load:', err);
      } finally {
        setIsLoadingFromDb(false);
      }
    };
    load();
  }, [userId, storageKey]);

  const syncToDatabase = useCallback(async (list: RoutineEntry[]) => {
    if (!supabaseConfigured || !userId) return false;
    try {
      setIsSyncing(true);
      const { error: delErr } = await supabase.from('user_routines').delete().eq('user_id', userId);
      if (delErr) throw delErr;
      if (list.length > 0) {
        const rows = list.map(e => ({
          user_id: userId,
          entry_id: e.id,
          title: e.title,
          course_code: e.courseCode || null,
          type: e.type,
          mode: e.mode,
          day: e.day,
          start_time: e.start,
          end_time: e.end,
          room: e.room || null,
          section: e.section || null,
          teacher: e.teacher || null,
          linked_to: e.linkedTo || null,
          created_at: new Date(e.createdAt).toISOString(),
        }));
        const { error: insErr } = await supabase.from('user_routines').insert(rows);
        if (insErr) throw insErr;
      }
      setSyncMessage('✓ Synced');
      setTimeout(() => setSyncMessage(null), 2000);
      return true;
    } catch {
      setSyncMessage('✗ Sync failed');
      setTimeout(() => setSyncMessage(null), 3000);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const persistEntries = useCallback((next: RoutineEntry[], opts: { sync?: boolean } = {}) => {
    const sanitized = enforceOverlapConstraints(next);
    setEntries(sanitized);
    try { localStorage.setItem(storageKey, JSON.stringify(sanitized)); } catch { /* ignore */ }
    if (!isLoadingFromDb && opts.sync !== false) syncToDatabase(sanitized);
  }, [isLoadingFromDb, storageKey, syncToDatabase]);

  const handleSave = useCallback(async () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      const ok = await syncToDatabase(entries);
      setSyncMessage(ok ? '✓ Saved & synced' : '✓ Saved locally');
      setTimeout(() => setSyncMessage(null), 2000);
    } catch {
      setSyncMessage('✗ Save failed');
      setTimeout(() => setSyncMessage(null), 2000);
    }
  }, [entries, storageKey, syncToDatabase]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<RoutineEntry>>({
    title: '', courseCode: '', type: 'regular', mode: 'theory',
    day: 'Sun', start: '09:45', end: '11:15', room: '', section: '', teacher: '',
  });
  const [labDuration, setLabDuration] = useState<90 | 180>(90);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const notesStorageKey = `userRoutineNotes_${userId || 'anon'}`;
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(notesStorageKey) || '{}'); } catch { return {}; }
  });
  const updateNote = useCallback((key: string, val: string) => {
    setNotes(prev => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem(notesStorageKey, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, [notesStorageKey]);

  useEffect(() => {
    const dur = form.mode === 'lab' && labDuration === 180 ? 180 : SLOT_MINUTES;
    const startMin = toMinutes(form.start || '08:15');
    let endMin = startMin + dur;
    if (form.mode === 'lab' && labDuration === 180) {
      const bS = toMinutes(BREAK_START), bE = toMinutes(BREAK_END);
      if (startMin < bS && startMin + dur > bS) endMin = startMin + dur + (bE - bS);
    }
    setForm(f => ({ ...f, end: fmt2(Math.min(endMin, toMinutes('23:59'))) }));
  }, [form.start, form.mode, labDuration]);

  const clearForm = () => setForm(f => ({ ...f, title: '', courseCode: '', room: '', section: '', teacher: '' }));

  // Open the Add-Class modal, optionally pre-filling the day, start time (from a grid click), and type
  const openAddModal = (day?: Day, startMin?: number, type?: RoutineType) => {
    setFormError(null);
    setForm(f => ({
      ...f,
      title: '', courseCode: '', room: '', section: '', teacher: '',
      day: day ?? f.day,
      start: startMin !== undefined ? fmt2(startMin) : (f.start || '08:15'),
      type: type ?? f.type,
    }));
    setShowFormModal(true);
  };

  const addEntry = () => {
    setFormError(null);
    if (!form.title?.trim() || !form.start || !form.end) { setFormError('Please fill in title and time.'); return; }
    const s = toMinutes(form.start), e = toMinutes(form.end);
    if (e <= s) { setFormError('End time must be after start time.'); return; }
    if (e > END_MINUTES) { setFormError(`End time must be on or before ${format12h(END_TIME)}.`); return; }
    const bS = toMinutes(BREAK_START), bE = toMinutes(BREAK_END);
    const newDay = (form.day as Day) || 'Sun';
    const newType = (form.type as RoutineType) || 'regular';

    // 3hr lab spanning break — auto-split
    if (form.mode === 'lab' && labDuration === 180 && Math.max(s, bS) < Math.min(e, bE)) {
      const firstEndMin = bS, secondStartMin = bE, secondEndMin = bE + SLOT_MINUTES;
      if (secondEndMin > END_MINUTES) { setFormError(`❌ 3hr lab cannot extend beyond ${format12h(END_TIME)}.`); return; }
      for (const [slotS, slotE] of [[s, firstEndMin], [secondStartMin, secondEndMin]] as [number, number][]) {
        const over = entries.filter(en => en.day === newDay && Math.max(slotS, toMinutes(en.start)) < Math.min(slotE, toMinutes(en.end)));
        if (over.length >= 2) { setFormError('❌ Max 2 overlapping courses. One 3hr lab slot has too many.'); return; }
        if (newType === 'regular' && over.some(en => en.type === 'regular')) { setFormError('❌ Cannot overlap two regular courses.'); return; }
        if (newType !== 'regular' && over.some(en => en.type !== 'regular')) { setFormError('❌ Cannot overlap two improvement/retake courses.'); return; }
      }
      const id1 = crypto.randomUUID(), id2 = crypto.randomUUID();
      const base = { title: form.title, courseCode: form.courseCode || undefined, type: newType, mode: 'lab' as ClassMode, day: newDay, room: form.room || undefined, section: form.section || undefined, teacher: form.teacher || undefined, createdAt: Date.now() };
      persistEntries([...entries, { ...base, id: id1, start: form.start, end: fmt2(firstEndMin), linkedTo: id2 }, { ...base, id: id2, start: fmt2(secondStartMin), end: fmt2(secondEndMin), linkedTo: id1 }]);
      clearForm();
      setShowFormModal(false);
      return;
    }

    if (Math.max(s, bS) < Math.min(e, bE)) { setFormError('12:45–1:15 is break. Choose another slot.'); return; }
    const over = entries.filter(en => en.day === newDay && Math.max(s, toMinutes(en.start)) < Math.min(e, toMinutes(en.end)));
    if (over.length >= 2) { setFormError('❌ Max 2 overlapping courses. Remove one first.'); return; }
    if (newType === 'regular' && over.some(en => en.type === 'regular')) { setFormError('❌ Cannot overlap two regular courses.'); return; }
    if (newType !== 'regular' && over.some(en => en.type !== 'regular')) { setFormError('❌ Cannot overlap two improvement/retake courses.'); return; }

    persistEntries([...entries, {
      id: crypto.randomUUID(), title: form.title, courseCode: form.courseCode || undefined,
      type: newType, mode: (form.mode as ClassMode) || 'theory', day: newDay,
      start: form.start, end: form.end, room: form.room || undefined,
      section: form.section || undefined, teacher: form.teacher || undefined, createdAt: Date.now(),
    }]);
    clearForm();
    setFormError(null);
    setShowFormModal(false);
  };

  const removeEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    persistEntries(entry?.linkedTo
      ? entries.filter(e => e.id !== id && e.id !== entry.linkedTo)
      : entries.filter(e => e.id !== id));
  };

  // ── Conflict resolution ────────────────────────────────────────────────────
  const { conflicts, deemphasize } = useMemo(() => {
    const conflicts: Record<string, string[]> = {};
    const deemphasize = new Set<string>();
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        if (!overlaps(a, b)) continue;
        if (!conflicts[a.id]) conflicts[a.id] = [];
        if (!conflicts[b.id]) conflicts[b.id] = [];
        conflicts[a.id].push(b.id);
        conflicts[b.id].push(a.id);
        if (a.type === 'regular' && b.type !== 'regular') deemphasize.add(b.id);
        else if (b.type === 'regular' && a.type !== 'regular') deemphasize.add(a.id);
        else deemphasize.add(a.createdAt <= b.createdAt ? b.id : a.id);
      }
    }
    return { conflicts, deemphasize };
  }, [entries]);

  const todayName = (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as Day[])[new Date().getDay()];
  const [mobileDay, setMobileDay] = useState<Day>(todayName);

  const [visibleDays, setVisibleDays] = useState<Day[]>(() => {
    const defaultDays: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    if (typeof window === 'undefined') return defaultDays;
    try {
      const stored = localStorage.getItem(`userRoutineVisibleDays_${userId || 'anon'}`);
      if (stored) return JSON.parse(stored) as Day[];
    } catch { /* ignore */ }
    return defaultDays;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`userRoutineVisibleDays_${userId || 'anon'}`, JSON.stringify(visibleDays));
    } catch { /* ignore */ }
  }, [visibleDays, userId]);

  useEffect(() => {
    const daysWithClasses = Array.from(new Set(entries.map(e => e.day)));
    const missingDays = daysWithClasses.filter(d => !visibleDays.includes(d));
    if (missingDays.length > 0) {
      setVisibleDays(prev => {
        const next = [...prev];
        missingDays.forEach(d => {
          if (!next.includes(d)) next.push(d);
        });
        const order: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      });
    }
  }, [entries, visibleDays]);

  useEffect(() => {
    if (visibleDays.length > 0 && !visibleDays.includes(mobileDay)) {
      setMobileDay(visibleDays[0]);
    }
  }, [visibleDays, mobileDay]);

  const [userIntake, setUserIntake] = useState(() => {
    if (typeof window === 'undefined') return "51";
    return localStorage.getItem(`userRoutineIntake_${userId || 'anon'}`) || "51";
  });

  const [userDepartment, setUserDepartment] = useState(() => {
    if (typeof window === 'undefined') return "CSE";
    return localStorage.getItem(`userRoutineDept_${userId || 'anon'}`) || "CSE";
  });

  const [userSection, setUserSection] = useState(() => {
    if (typeof window === 'undefined') return "2";
    return localStorage.getItem(`userRoutineSection_${userId || 'anon'}`) || "2";
  });

  const handleIntakeChange = (val: string) => {
    setUserIntake(val);
    localStorage.setItem(`userRoutineIntake_${userId || 'anon'}`, val);
  };

  const handleDeptChange = (val: string) => {
    setUserDepartment(val);
    localStorage.setItem(`userRoutineDept_${userId || 'anon'}`, val);
  };

  const handleSectionChange = (val: string) => {
    setUserSection(val);
    localStorage.setItem(`userRoutineSection_${userId || 'anon'}`, val);
  };

  const toggleDayVisibility = (day: Day) => {
    setVisibleDays(prev => {
      let next;
      if (prev.includes(day)) {
        const hasClasses = entries.some(e => e.day === day);
        if (hasClasses) return prev; // Cannot hide day if it has classes
        next = prev.filter(d => d !== day);
      } else {
        next = [...prev, day];
      }
      const order: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  };

  // ── Grid helpers (desktop weekly grid) ───────────────────────────────────────
  const intervals = useMemo(() => {
    const uniqueMinutes = new Set<number>();
    
    // Always start at 08:15 unless user has earlier entries.
    const startMins = Math.min(toMinutes('08:15'), ...entries.map(e => toMinutes(e.start)));
    const endMins = Math.max(toMinutes('17:15'), ...entries.map(e => toMinutes(e.end)));
    
    uniqueMinutes.add(startMins);
    uniqueMinutes.add(endMins);
    uniqueMinutes.add(toMinutes(BREAK_START));
    uniqueMinutes.add(toMinutes(BREAK_END));

    entries.forEach(e => {
      uniqueMinutes.add(toMinutes(e.start));
      uniqueMinutes.add(toMinutes(e.end));
    });

    const sorted = Array.from(uniqueMinutes).sort((a, b) => a - b);
    const list = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      list.push({
        start,
        end,
        duration: end - start,
      });
    }
    return list;
  }, [entries]);

  const groups = useMemo(() => {
    const res: Record<string, RoutineEntry[]> = {};
    entries.forEach(e => {
      const key = `${e.day}-${e.start}`;
      if (!res[key]) res[key] = [];
      res[key].push(e);
    });
    return res;
  }, [entries]);

  const GRID_H = 580;

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const dayRows = ALL_DAYS.map(d => ({
      day: d,
      slots: entries.filter(e => e.day === d).sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
    })).filter(d => d.slots.length > 0);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>My Routine · Edu51Portal</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:36px 48px;color:#0f172a;font-size:13px;max-width:760px;margin:0 auto}
  h1{font-size:22px;font-weight:800;margin:0 0 3px}
  .sub{color:#475569;font-size:14px;margin-bottom:28px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:500}
  .pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:700;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}
  .day{margin-bottom:24px}
  .day-name{font-weight:800;font-size:13px;color:#1e293b;padding-bottom:6px;border-bottom:2px solid #e2e8f0;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse}
  th{padding:5px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:1px solid #e2e8f0}
  td{padding:8px 10px;border-bottom:1px solid #f8fafc;vertical-align:middle}
  .tag{display:inline-block;padding:2px 7px;border-radius:9999px;font-size:9px;font-weight:800;color:#fff;margin-right:3px}
  .regular{background:#059669}.improvement{background:#2563eb}.retake{background:#e11d48}
  .lab{background:#7c3aed}.theory{background:#64748b}
  @media print{body{padding:20px}h1{font-size:18px}}
</style></head><body>
<h1>Edu<span style="color:#e11d48">51</span>Portal · My Routine</h1>
<div class="sub">
  <span class="pill">Intake ${userIntake}</span>
  <span class="pill">Dept ${userDepartment}</span>
  ${userSection ? `<span class="pill">Sec ${userSection}</span>` : ''}
  <span style="color:#cbd5e1;margin:0 4px">•</span>
  <span>Custom Routine</span>
  <span style="color:#cbd5e1;margin:0 4px">•</span>
  <span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
</div>
${dayRows.map(({ day, slots }) => `<div class="day"><div class="day-name">${day}</div>
<table><tr><th>Time</th><th>Course</th><th>Room / Section</th><th>Teacher</th><th>Type</th></tr>
${slots.map(s => `<tr>
  <td style="white-space:nowrap;font-weight:600;color:#334155">${format12h(s.start)} – ${format12h(s.end)}</td>
  <td><strong>${s.title}</strong>${s.courseCode ? ` <span style="color:#94a3b8;font-size:11px">(${s.courseCode})</span>` : ''}</td>
  <td style="color:#64748b">${[s.room, s.section].filter(Boolean).join(' · ') || '–'}</td>
  <td style="color:#64748b">${s.teacher || '–'}</td>
  <td><span class="tag ${s.type}">${s.type === 'regular' ? 'REG' : s.type === 'improvement' ? 'IMP' : 'RT'}</span><span class="tag ${s.mode}">${s.mode === 'lab' ? 'LAB' : 'TH'}</span></td>
</tr>`).join('')}
</table></div>`).join('')}
</body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 300); }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputCls = `w-full px-3 py-2 rounded-lg border text-xs transition-all focus:outline-none focus:ring-1 focus:ring-[#1e9df1]/40 ${dk ? 'bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b]' : 'bg-white border-slate-200 text-slate-900 placeholder-[#71767b]'}`;
  const labelCls = `text-[10px] font-bold uppercase tracking-wider block mb-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`;

  // ── Selected entry detail ──────────────────────────────────────────────────
  const selEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;
  const selConflicts = selectedEntryId
    ? (conflicts[selectedEntryId] ?? []).map(id => entries.find(e => e.id === id)).filter(Boolean) as RoutineEntry[]
    : [];

  // Per-day accent colours
  const DAY_COLOR: Record<string, string> = {
    Sun: '#0ea5e9', Mon: '#7c3aed', Tue: '#d97706', Wed: '#059669', Thu: '#e11d48',
    Fri: '#ec4899', Sat: '#6366f1',
  };

  return (
    <div className={`h-full flex flex-col ${dk ? 'bg-[#0a0f0e] text-white' : 'bg-slate-100 text-slate-900'}`}>

      {/* ── Top bar ── */}
      <div className={`print-hide flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b ${dk ? 'bg-[#17181c]/90 border-[#2f3336]' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-sm font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>My Routine</span>
          {/* Intake, Dept & Section Configuration */}
          <div className="flex items-center gap-1.5 border-l pl-2.5 border-slate-200 dark:border-[#2f3336]">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Intake:</span>
            <input
              type="text"
              value={userIntake}
              onChange={(e) => handleIntakeChange(e.target.value)}
              className={`w-10 px-1 py-0.5 rounded border text-[10px] font-bold text-center transition-all ${
                dk
                  ? "bg-[#16181c] border-[#2f3336] text-slate-300 focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]/40"
                  : "bg-white border-slate-200 text-slate-700 focus:border-[#1677cc] focus:ring-1 focus:ring-[#1677cc]/40"
              }`}
              placeholder="51"
            />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Dept:</span>
            <input
              type="text"
              value={userDepartment}
              onChange={(e) => handleDeptChange(e.target.value)}
              className={`w-14 px-1 py-0.5 rounded border text-[10px] font-bold text-center transition-all ${
                dk
                  ? "bg-[#16181c] border-[#2f3336] text-slate-300 focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]/40"
                  : "bg-white border-slate-200 text-slate-700 focus:border-[#1677cc] focus:ring-1 focus:ring-[#1677cc]/40"
              }`}
              placeholder="CSE"
            />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Sec:</span>
            <input
              type="text"
              value={userSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              className={`w-10 px-1 py-0.5 rounded border text-[10px] font-bold text-center transition-all ${
                dk
                  ? "bg-[#16181c] border-[#2f3336] text-slate-300 focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]/40"
                  : "bg-white border-slate-200 text-slate-700 focus:border-[#1677cc] focus:ring-1 focus:ring-[#1677cc]/40"
              }`}
              placeholder="2"
            />
          </div>
          
          {/* Day Adjuster Toggles */}
          <div className="flex items-center gap-1.5 border-l pl-2.5 border-slate-200 dark:border-[#2f3336]">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Days:</span>
            {ALL_DAYS.map(day => {
              const isVisible = visibleDays.includes(day);
              const hasClasses = entries.some(e => e.day === day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDayVisibility(day)}
                  disabled={hasClasses}
                  className={`text-[9px] font-black w-[22px] h-[22px] rounded-full flex items-center justify-center border transition-all ${
                    isVisible
                      ? dk ? 'bg-sky-500/20 border-sky-500 text-sky-400' : 'bg-sky-50 border-sky-300 text-sky-600 shadow-sm'
                      : dk ? 'border-[#2f3336] text-slate-600 hover:border-slate-700' : 'border-slate-200 text-slate-300 hover:border-slate-400'
                  } ${hasClasses ? 'opacity-90 cursor-not-allowed' : ''}`}
                  title={hasClasses ? `${day} contains classes (cannot hide)` : `${isVisible ? 'Hide' : 'Show'} ${day}`}
                >
                  {day[0]}
                </button>
              );
            })}
          </div>

          {entries.length > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dk ? 'bg-[#16181c] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {entries.length} {entries.length === 1 ? 'class' : 'classes'}
            </span>
          )}
          {(syncMessage || isSyncing) && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isSyncing ? dk ? 'text-slate-500' : 'text-slate-400'
              : syncMessage?.startsWith('✓')
              ? dk ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              : dk ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
            }`}>{isSyncing ? 'Syncing…' : syncMessage}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={() => persistEntries([])}
              title="Clear all classes"
              className={`p-1.5 rounded-lg border transition-all ${dk ? 'border-[#2f3336] text-slate-500 hover:text-rose-400 hover:border-rose-800/40 hover:bg-rose-900/10' : 'border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={entries.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 ${dk ? 'border-[#2f3336] text-slate-400 hover:border-[#38444d] hover:text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 bg-white'}`}
          >
            <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${dk ? 'border-[#2f3336] text-slate-300 hover:text-white hover:border-[#38444d]' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 bg-white'}`}
          >
            <Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #1e9df1 0%, #7c3aed 100%)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Class
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isLoadingFromDb && entries.length === 0 && (
          <div className={`absolute inset-0 z-20 flex items-center justify-center ${dk ? 'bg-[#0a0f0e]' : 'bg-slate-100'}`}>
            <Loader />
          </div>
        )}

        {/* ── Desktop: colorful weekly grid ── */}
        <div className="hidden lg:flex flex-1 overflow-x-auto overflow-y-auto flex-col min-w-0 p-4">
          <div className="min-w-[720px] max-w-[1040px] w-full mx-auto rounded-3xl overflow-hidden shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e9df1 0%, #7c3aed 100%)' }}>

            {/* Banner strip */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-white font-black text-xl tracking-tight drop-shadow-sm">Weekly Routine</h2>
              <span className="text-[11px] font-bold text-white/85 uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15">
                Intake {userIntake} · {userDepartment}{userSection ? ` · Sec ${userSection}` : ""}
              </span>
            </div>

            {/* Inset white/dark table */}
            <div className={`mx-2.5 mb-2.5 rounded-2xl overflow-hidden ${dk ? 'bg-[#0d0f11]' : 'bg-white'}`}>

              {/* Header row: Time | Day pills | Notes */}
              <div className={`grid border-b ${dk ? 'border-[#2f3336]' : 'border-slate-200'}`}
                style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, 1fr) minmax(150px, 200px)` }}>

                <div className={`flex items-center justify-center py-3 border-r ${dk ? 'border-[#2f3336]' : 'border-slate-100'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Time</span>
                </div>

                {visibleDays.map(d => {
                  const isToday = d === todayName;
                  const color = DAY_COLOR[d];
                  return (
                    <div key={d} className={`flex flex-col items-center justify-center py-2.5 gap-0.5 border-r ${dk ? 'border-[#2f3336]' : 'border-slate-100'}`}>
                      <span className="text-[12px] font-black text-white px-4 py-[5px] rounded-full shadow-sm"
                        style={{ background: color, boxShadow: isToday ? `0 2px 12px ${color}80` : undefined, opacity: isToday ? 1 : 0.72 }}>
                        {d}
                      </span>
                      {isToday && <span className="text-[8px] font-bold leading-none" style={{ color }}>Today</span>}
                    </div>
                  );
                })}

                <div className="flex items-center justify-center py-3">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Notes</span>
                </div>
              </div>

              {/* Grid body */}
              <div className="grid relative" style={{
                gridTemplateColumns: `72px repeat(${visibleDays.length}, 1fr) minmax(150px, 200px)`,
                gridTemplateRows: intervals.map(int => `${Math.max(48, int.duration * 0.8)}px`).join(' '),
              }}>

                {/* Day column backgrounds & vertical dividers */}
                {visibleDays.map((d, colIdx) => {
                  const color = DAY_COLOR[d];
                  return (
                    <div
                      key={`col-bg-${d}`}
                      className={`border-r ${dk ? 'border-[#2f3336]' : 'border-slate-100'}`}
                      style={{
                        gridColumnStart: colIdx + 2,
                        gridRowStart: 1,
                        gridRowEnd: intervals.length + 1,
                        background: dk ? `${color}04` : `${color}06`,
                        zIndex: 0,
                      }}
                    />
                  );
                })}

                {/* Time column labels */}
                {intervals.map((int, idx) => (
                  <div
                    key={`time-label-${idx}`}
                    className={`flex flex-col items-end justify-center pr-2.5 py-1 select-none border-b border-r ${dk ? 'border-[#2f3336]' : 'border-slate-100'}`}
                    style={{
                      gridColumnStart: 1,
                      gridRowStart: idx + 1,
                      gridRowEnd: idx + 2,
                      zIndex: 1,
                    }}
                  >
                    <span className={`text-[9px] font-bold tabular-nums leading-tight text-right ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                      {format12h(fmt2(int.start))}
                    </span>
                    <span className={`text-[9px] font-bold tabular-nums leading-tight text-right ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                      – {format12h(fmt2(int.end))}
                    </span>
                  </div>
                ))}

                {/* Clickable empty cells (hover for '+') and horizontal lines */}
                {visibleDays.map((d, colIdx) => (
                  intervals.map((int, rowIdx) => {
                    const isBreak = Math.max(int.start, toMinutes(BREAK_START)) < Math.min(int.end, toMinutes(BREAK_END));
                    if (isBreak) return null;
                    return (
                      <button
                        key={`slot-${d}-${rowIdx}`}
                        onClick={() => openAddModal(d, int.start)}
                        className="relative flex items-center justify-center group/slot transition-colors hover:bg-[#1e9df1]/5"
                        style={{
                          gridColumnStart: colIdx + 2,
                          gridRowStart: rowIdx + 1,
                          gridRowEnd: rowIdx + 2,
                          zIndex: 1,
                          borderBottom: rowIdx === intervals.length - 1 ? undefined : `1px solid ${dk ? 'rgba(47,51,54,0.4)' : 'rgba(203,213,225,0.4)'}`,
                        }}
                        title={`Add class · ${d}`}
                      >
                        <span className="opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 rounded-full bg-[#1e9df1]/12 text-[#1e9df1]">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    );
                  })
                ))}

                {/* Notes column */}
                {intervals.map((int, idx) => {
                  const key = fmt2(int.start);
                  return (
                    <div
                      key={`notes-${idx}`}
                      className={`relative border-b ${dk ? 'border-[#2f3336]' : 'border-slate-100'} ${dk ? 'bg-[#16181c]/30' : 'bg-amber-50/20'}`}
                      style={{
                        gridColumnStart: visibleDays.length + 2,
                        gridRowStart: idx + 1,
                        gridRowEnd: idx + 2,
                        zIndex: 1,
                      }}
                    >
                      <textarea
                        value={notes[key] || ''}
                        onChange={e => updateNote(key, e.target.value)}
                        placeholder="Add note…"
                        style={{ fontSize: noteFontSize(notes[key] || '') }}
                        className={`w-full h-full px-2 py-1.5 leading-relaxed resize-none bg-transparent border-0 focus:outline-none focus:bg-amber-50/50 transition-colors ${dk ? 'text-slate-300 placeholder-slate-600 focus:bg-[#16181c]/30' : 'text-slate-600 placeholder-slate-300'}`}
                      />
                    </div>
                  );
                })}

                {/* Break overlay */}
                {(() => {
                  const breakRowIdx = intervals.findIndex(int => int.start === toMinutes(BREAK_START) && int.end === toMinutes(BREAK_END));
                  if (breakRowIdx === -1) return null;
                  return (
                    <div
                      className={`absolute z-10 flex items-center justify-center border-y pointer-events-none ${
                        dk ? 'bg-[#0d0f11]/90 border-[#2f3336]/60' : 'bg-violet-50/90 border-violet-200/60'
                      }`}
                      style={{
                        gridColumnStart: 2,
                        gridColumnEnd: visibleDays.length + 2,
                        gridRowStart: breakRowIdx + 1,
                        gridRowEnd: breakRowIdx + 2,
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                      }}
                    >
                      <span className={`text-[10px] font-black tracking-widest uppercase ${dk ? 'text-violet-400' : 'text-violet-500'}`}>
                        Break &nbsp;·&nbsp; 12:45 – 1:15
                      </span>
                    </div>
                  );
                })()}

                {/* Entry cards */}
                <AnimatePresence>
                  {Object.entries(groups).map(([groupKey, group]) => {
                    if (group.length === 0) return null;
                    const first = group[0];
                    const startRowIdx = intervals.findIndex(int => int.start === toMinutes(first.start));
                    const endRowIdx = intervals.findIndex(int => int.end === toMinutes(first.end));
                    if (startRowIdx === -1 || endRowIdx === -1) return null;

                    const colIdx = visibleDays.indexOf(first.day);
                    if (colIdx === -1) return null;

                    return (
                      <div
                        key={groupKey}
                        className="p-0.5 h-full w-full"
                        style={{
                          gridColumnStart: colIdx + 2,
                          gridRowStart: startRowIdx + 1,
                          gridRowEnd: endRowIdx + 2,
                          zIndex: 10,
                        }}
                      >
                        <div className={`h-full w-full ${group.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
                          {group.map(entry => {
                            const typeColor = entry.type === 'regular' ? '#10b981' : entry.type === 'improvement' ? '#3b82f6' : '#f43f5e';
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                                onClick={() => setSelectedEntryId(entry.id)}
                                className={`relative cursor-pointer group rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:z-30 h-full ${dk ? 'bg-[#1b1e23]' : 'bg-white'}`}
                                style={{
                                  border: `1px solid ${typeColor}${dk ? '40' : '2b'}`,
                                }}
                              >
                                <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: typeColor }} />
                                <div className="h-full pl-2.5 pr-1.5 py-1.5 flex flex-col overflow-hidden justify-between">
                                  <div className="min-w-0">
                                    <div className={`text-[10px] font-bold leading-tight line-clamp-1 ${dk ? 'text-white' : 'text-slate-900'}`} title={entry.title}>
                                      {entry.title}
                                    </div>
                                    {entry.courseCode && (
                                      <div className={`text-[8px] font-semibold mt-0.5 leading-none ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {entry.courseCode}
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 mt-1">
                                    <div className={`text-[8px] leading-none tabular-nums ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {format12h(entry.start)}–{format12h(entry.end)}
                                    </div>
                                    {(entry.room || entry.section) && (
                                      <div className={`text-[8px] mt-0.5 leading-none ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {[entry.room, entry.section].filter(Boolean).join(' · ')}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-0.5 pt-1 mt-auto">
                                    <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded text-white leading-none" style={{ background: typeColor }}>
                                      {entry.type === 'regular' ? 'REG' : entry.type === 'improvement' ? 'IMP' : 'RT'}
                                    </span>
                                    <span className={`text-[6.5px] font-black px-1.5 py-0.5 rounded text-white leading-none ${entry.mode === 'lab' ? 'bg-violet-500' : 'bg-slate-400'}`}>
                                      {entry.mode === 'lab' ? 'LAB' : 'TH'}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={ev => { ev.stopPropagation(); removeEntry(entry.id); }}
                                  className={`absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${dk ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-900/20' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </AnimatePresence>

              </div>
            </div>
          </div>

          {/* Legend */}
          <div className={`print-hide flex items-center gap-3 flex-wrap mt-3 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
            {[{ c: '#10b981', l: 'Regular' }, { c: '#3b82f6', l: 'Improv.' }, { c: '#f43f5e', l: 'Retake' }].map(({ c, l }) => (
              <span key={l} className="inline-flex items-center gap-1 text-[10px] font-medium">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />{l}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 text-[10px] font-medium">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-violet-500" />Lab
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-400" />Theory
            </span>
            <span className={`ml-auto text-[9px] ${dk ? 'text-slate-600' : 'text-[#8b98a5]'}`}>Click an empty slot to add · a card to see details</span>
          </div>
        </div>

        {/* ── Mobile: day switcher + agenda list ── */}
        <div className="lg:hidden flex-1 flex flex-col min-w-0">
          {/* Day tabs */}
          <div className={`print-hide sticky top-0 z-10 flex gap-1.5 px-4 py-3 overflow-x-auto border-b ${dk ? 'bg-[#17181c]/95 border-[#2f3336] backdrop-blur' : 'bg-white/95 border-slate-200 backdrop-blur'}`}>
            {visibleDays.map(d => {
              const isSelected = d === mobileDay;
              const isToday = d === todayName;
              const color = DAY_COLOR[d];
              const count = entries.filter(e => e.day === d).length;
              return (
                <button key={d} onClick={() => setMobileDay(d)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all"
                  style={isSelected
                    ? { background: color, color: '#fff', boxShadow: `0 2px 10px ${color}80` }
                    : { background: dk ? '#16181c' : '#f1f5f9', color: dk ? '#8b98a5' : '#64748b' }}>
                  {d}{isToday && <span className="w-1 h-1 rounded-full bg-current opacity-70" />}
                  {count > 0 && <span className="opacity-70">· {count}</span>}
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-4 space-y-4">
            {(() => {
              const dayEntries = entries.filter(e => e.day === mobileDay).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
              return (
                <div className={`rounded-2xl border overflow-hidden ${dk ? 'border-[#2f3336] bg-[#17181c]' : 'border-slate-200 bg-white'}`}>
                  {dayEntries.length === 0 ? (
                    <button onClick={() => openAddModal(mobileDay)}
                      className={`w-full flex flex-col items-center justify-center gap-1.5 px-4 py-8 transition-colors ${dk ? 'text-slate-500 hover:bg-[#16181c]' : 'text-slate-400 hover:bg-slate-50'}`}>
                      <span className={`flex items-center justify-center w-9 h-9 rounded-full ${dk ? 'bg-[#1e9df1]/15 text-[#1e9df1]' : 'bg-[#1e9df1]/10 text-[#1e9df1]'}`}>
                        <Plus className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold">Add a class to {mobileDay}</span>
                    </button>
                  ) : (
                    <AnimatePresence>
                      <div className={`divide-y ${dk ? 'divide-[#2f3336]' : 'divide-slate-100'}`}>
                        {dayEntries.map(entry => {
                          const isDeemphasized = deemphasize.has(entry.id);
                          const hasConflict = !!conflicts[entry.id]?.length;
                          const typeColor = entry.type === 'regular' ? '#10b981' : entry.type === 'improvement' ? '#3b82f6' : '#f43f5e';
                          return (
                            <motion.div key={entry.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: isDeemphasized ? 0.6 : 1 }}
                              exit={{ opacity: 0, transition: { duration: 0.12 } }}
                              onClick={() => setSelectedEntryId(entry.id)}
                              className={`flex items-center gap-3 pl-3 pr-4 py-3 cursor-pointer transition-colors ${dk ? 'hover:bg-[#16181c]' : 'hover:bg-slate-50'}`}
                              style={{ borderLeft: `3px solid ${typeColor}` }}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-sm font-bold truncate ${dk ? 'text-white' : 'text-slate-900'}`}>{entry.title}</span>
                                  {entry.courseCode && (
                                    <span className={`text-xs flex-shrink-0 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{entry.courseCode}</span>
                                  )}
                                  {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                </div>
                                <div className={`flex items-center gap-1.5 flex-wrap text-xs mt-0.5 ${dk ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <span className="font-medium tabular-nums">{format12h(entry.start)}–{format12h(entry.end)}</span>
                                  {(entry.room || entry.section) && (
                                    <span>· {[entry.room, entry.section].filter(Boolean).join(' · ')}</span>
                                  )}
                                  {entry.teacher && <span>· {entry.teacher}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white leading-none" style={{ background: typeColor }}>
                                  {entry.type === 'regular' ? 'Reg' : entry.type === 'improvement' ? 'Imp' : 'RT'}
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white leading-none ${entry.mode === 'lab' ? 'bg-violet-500' : 'bg-slate-400'}`}>
                                  {entry.mode === 'lab' ? 'Lab' : 'Th'}
                                </span>
                                <button
                                  onClick={ev => { ev.stopPropagation(); removeEntry(entry.id); }}
                                  className={`p-1 rounded transition-colors ${dk ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/20' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}>
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  )}

                  {/* Add-class row (non-empty days) */}
                  {dayEntries.length > 0 && (
                    <button onClick={() => openAddModal(mobileDay)}
                      className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-t transition-colors ${dk ? 'border-[#2f3336] text-[#1e9df1] hover:bg-[#16181c]' : 'border-slate-100 text-[#1677cc] hover:bg-slate-50'}`}>
                      <Plus className="w-3.5 h-3.5" /> Add class to {mobileDay}
                    </button>
                  )}

                  {/* Day notes */}
                  <div className={`border-t ${dk ? 'border-[#2f3336] bg-[#16181c]/40' : 'border-slate-100 bg-amber-50/40'}`}>
                    <textarea
                      value={notes[mobileDay] || ''}
                      onChange={e => updateNote(mobileDay, e.target.value)}
                      placeholder="Add a note for this day…"
                      rows={1}
                      className={`w-full px-4 py-2 text-xs leading-relaxed resize-none bg-transparent border-0 focus:outline-none ${dk ? 'text-slate-300 placeholder-slate-600' : 'text-slate-600 placeholder-slate-300'}`}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            <div className={`print-hide flex items-center gap-3 flex-wrap pt-1 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {[{ c: '#10b981', l: 'Regular' }, { c: '#3b82f6', l: 'Improv.' }, { c: '#f43f5e', l: 'Retake' }].map(({ c, l }) => (
                <span key={l} className="inline-flex items-center gap-1 text-[10px] font-medium">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />{l}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                <span className="w-2 h-2 rounded-full flex-shrink-0 bg-violet-500" />Lab
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                <span className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-400" />Theory
              </span>
              <span className={`text-[9px] ${dk ? 'text-slate-600' : 'text-[#8b98a5]'}`}>Break 12:45–1:15 · Tap a class for details</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail / conflict modal ── */}
      <AnimatePresence>
        {selectedEntryId && selEntry && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEntryId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden ${dk ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${dk ? 'border-[#2f3336]' : 'border-slate-100'}`}>
                <h3 className={`text-sm font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>
                  {selConflicts.length > 0 ? 'Overlapping Courses' : 'Course Details'}
                </h3>
                <button onClick={() => setSelectedEntryId(null)} className={`p-1.5 rounded-lg ${dk ? 'hover:bg-[#16181c] text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {[selEntry, ...selConflicts].map((entry, idx) => {
                  const accentBar = entry.type === 'regular' ? 'bg-emerald-500' : entry.type === 'improvement' ? 'bg-blue-500' : 'bg-rose-500';
                  const typePill = entry.type === 'regular' ? 'bg-emerald-600' : entry.type === 'improvement' ? 'bg-blue-600' : 'bg-rose-600';
                  return (
                    <div key={entry.id} className={`rounded-xl border overflow-hidden ${dk ? 'border-[#2f3336] bg-[#16181c]' : 'border-slate-100 bg-slate-50'}`}>
                      <div className={`h-[3px] ${accentBar}`} />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className={`font-bold text-sm leading-tight ${dk ? 'text-white' : 'text-slate-900'}`}>{entry.title}</div>
                            {entry.courseCode && <div className={`text-xs mt-0.5 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{entry.courseCode}</div>}
                          </div>
                          <div className="flex flex-col gap-1 items-end flex-shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${typePill}`}>{entry.type}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${entry.mode === 'lab' ? 'bg-violet-600' : 'bg-slate-500'}`}>{entry.mode}</span>
                          </div>
                        </div>
                        <div className={`space-y-1 text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {entry.day} · {format12h(entry.start)} – {format12h(entry.end)}
                          </div>
                          {(entry.room || entry.section) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[entry.room, entry.section].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {entry.teacher && <div>{entry.teacher}</div>}
                        </div>
                        {idx > 0 && (
                          <button
                            onClick={() => { removeEntry(entry.id); setSelectedEntryId(null); }}
                            className={`mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${dk ? 'bg-rose-900/20 text-rose-400 hover:bg-rose-900/40 border-rose-900/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100'}`}
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {selEntry && selConflicts.length === 0 && (
                  <button
                    onClick={() => {
                      const t: RoutineType = selEntry.type === 'regular' ? 'improvement' : 'regular';
                      openAddModal(selEntry.day, toMinutes(selEntry.start), t);
                      setSelectedEntryId(null);
                    }}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 border-dashed transition-all ${dk ? 'border-[#2f3336] text-[#1e9df1] hover:border-[#1e9df1]/50 hover:bg-[#1e9df1]/5' : 'border-slate-200 text-[#1677cc] hover:border-[#1e9df1]/50 hover:bg-[#1e9df1]/5'}`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add {selEntry.type === 'regular' ? 'improvement / retake' : 'regular'} in this slot
                  </button>
                )}
                {selConflicts.length > 0 && (
                  <div className={`flex items-start gap-1.5 px-3 py-2 rounded-xl text-xs border ${dk ? 'bg-amber-900/15 text-amber-300 border-amber-800/30' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    Remove one course or adjust times to resolve the overlap.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add-class modal ── */}
      <AnimatePresence>
        {showFormModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFormModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className={`w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl border ${dk ? 'bg-[#17181c] border-[#2f3336]' : 'bg-white border-slate-200'}`}
            >
              {/* Gradient header */}
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e9df1 0%, #7c3aed 100%)' }}>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">Add Class</h3>
                  <p className="text-white/75 text-[10px] mt-0.5">Break 12:45–1:15 · 3hr labs auto-split</p>
                </div>
                <button onClick={() => setShowFormModal(false)} className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3.5">
                <div>
                  <label className={labelCls}>Title</label>
                  <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addEntry()} className={inputCls} placeholder="e.g., Software Eng." autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Code</label>
                    <input value={form.courseCode || ''} onChange={e => setForm(f => ({ ...f, courseCode: e.target.value }))} className={inputCls} placeholder="CSE-327" />
                  </div>
                  <div>
                    <label className={labelCls}>Day</label>
                    <select value={form.day as string} onChange={e => setForm(f => ({ ...f, day: e.target.value as Day }))} className={inputCls}>
                      {ALL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Type</label>
                    <div className={`flex rounded-lg p-0.5 ${dk ? 'bg-[#16181c]' : 'bg-slate-100'}`}>
                      {(['regular', 'improvement', 'retake'] as const).map((v, i) => {
                        const lbl = ['Reg', 'Imp', 'RT'][i];
                        const cls = ['bg-emerald-600', 'bg-blue-600', 'bg-rose-600'][i];
                        return (
                          <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v }))}
                            className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${form.type === v ? `${cls} text-white` : dk ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-slate-400 hover:text-slate-700'}`}>
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Mode</label>
                    <div className={`flex rounded-lg p-0.5 ${dk ? 'bg-[#16181c]' : 'bg-slate-100'}`}>
                      {(['theory', 'lab'] as const).map(v => (
                        <button key={v} type="button" onClick={() => setForm(f => ({ ...f, mode: v }))}
                          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md capitalize transition-all ${form.mode === v ? 'bg-violet-600 text-white' : dk ? 'text-slate-500 hover:text-[#8b98a5]' : 'text-slate-400 hover:text-slate-700'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Start</label>
                    <input
                      type="time"
                      value={form.start || ''}
                      onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End</label>
                    <input
                      type="time"
                      value={form.end || ''}
                      onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                {form.mode === 'lab' && (
                  <div>
                    <label className={labelCls}>Lab Duration (Auto-Split Helper)</label>
                    <select
                      value={labDuration}
                      onChange={e => setLabDuration(Number(e.target.value) as 90 | 180)}
                      className={inputCls}
                    >
                      <option value={90}>1h 30m (Standard Lab)</option>
                      <option value={180}>3h (Auto-split across 12:45–1:15 Break)</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Room</label>
                    <input value={form.room || ''} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className={inputCls} placeholder="2710" />
                  </div>
                  <div>
                    <label className={labelCls}>Section</label>
                    <input value={form.section || ''} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className={inputCls} placeholder="S-5" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Teacher</label>
                  <input value={form.teacher || ''} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))} className={inputCls} placeholder="Initials or name" />
                </div>

                {formError && (
                  <div className={`flex items-start gap-1.5 px-2.5 py-2 rounded-lg text-xs border ${dk ? 'bg-amber-900/20 text-amber-300 border-amber-800/40' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{formError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-2.5">
                <button onClick={() => setShowFormModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${dk ? 'border-[#2f3336] text-slate-400 hover:text-white hover:border-[#38444d]' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                  Cancel
                </button>
                <button onClick={addEntry}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1e9df1 0%, #7c3aed 100%)' }}>
                  <Plus className="w-3.5 h-3.5" /> Add Class
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
