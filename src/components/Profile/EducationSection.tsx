import { useState } from "react";
import { GraduationCap, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Education } from "../../types/social";
import { upsertEducation, deleteEducation } from "../../lib/api/profileApi";

interface Props {
  userId: string;
  educations: Education[];
  isOwn: boolean;
  isDarkMode: boolean;
  onChanged: () => void;
}

export default function EducationSection({ userId, educations, isOwn, isDarkMode, onChanged }: Props) {
  const [editing, setEditing] = useState<Partial<Education> | null>(null);

  const card = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200";
  const title = isDarkMode ? "text-[#e7e9ea]" : "text-slate-900";
  const sub = isDarkMode ? "text-[#71767b]" : "text-slate-500";

  if (!isOwn && educations.length === 0) return null;

  return (
    <section className={`rounded-2xl border p-5 ${card}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-bold flex items-center gap-2 ${title}`}>
          <GraduationCap className="w-5 h-5 text-[#1e9df1]" /> Education
        </h3>
        {isOwn && (
          <button
            onClick={() => setEditing({ user_id: userId })}
            className="p-1.5 rounded-lg text-[#1e9df1] hover:bg-[#1e9df1]/10"
            title="Add education"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {educations.length === 0 ? (
        <p className={`text-sm ${sub}`}>No education added yet.</p>
      ) : (
        <ul className="space-y-4">
          {educations.map((edu) => (
            <li key={edu.id} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
                <GraduationCap className={`w-5 h-5 ${sub}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${title}`}>{edu.institution}</p>
                <p className={`text-xs ${sub}`}>
                  {[edu.degree, edu.department].filter(Boolean).join(" · ")}
                </p>
                <p className={`text-xs ${sub}`}>
                  {[edu.session && `Session ${edu.session}`, edu.graduation_year && `Class of ${edu.graduation_year}`, edu.cgpa != null && `CGPA ${edu.cgpa}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {isOwn && (
                <div className="flex gap-1">
                  <button onClick={() => setEditing(edu)} className={`p-1.5 rounded-lg hover:bg-blue-500/10 ${sub}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      await deleteEducation(edu.id);
                      onChanged();
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EducationFormModal
          initial={editing}
          isDarkMode={isDarkMode}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function EducationFormModal({
  initial,
  isDarkMode,
  onClose,
  onSaved,
}: {
  initial: Partial<Education>;
  isDarkMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [institution, setInstitution] = useState(initial.institution ?? "");
  const [department, setDepartment] = useState(initial.department ?? "");
  const [degree, setDegree] = useState(initial.degree ?? "");
  const [session, setSession] = useState(initial.session ?? "");
  const [gradYear, setGradYear] = useState(initial.graduation_year?.toString() ?? "");
  const [cgpa, setCgpa] = useState(initial.cgpa?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-[#1e9df1]"
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`;

  const save = async () => {
    if (!institution.trim()) {
      setError("Institution is required.");
      return;
    }
    const parsedCgpa = cgpa.trim() ? parseFloat(cgpa) : null;
    if (parsedCgpa != null && (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 4)) {
      setError("CGPA must be between 0.00 and 4.00.");
      return;
    }
    setSaving(true);
    const { error: err } = await upsertEducation({
      id: initial.id,
      user_id: initial.user_id!,
      institution: institution.trim(),
      department: department.trim() || null,
      degree: degree.trim() || null,
      session: session.trim() || null,
      graduation_year: gradYear.trim() ? parseInt(gradYear, 10) : null,
      cgpa: parsedCgpa,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDarkMode ? "bg-[#17181c] border border-[#2f3336]" : "bg-white"}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <h3 className={`font-bold ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>
            {initial.id ? "Edit Education" : "Add Education"}
          </h3>
          <button onClick={onClose} className={isDarkMode ? "text-[#71767b]" : "text-slate-500"}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{error}</div>}
          <div>
            <label className={labelCls}>Institution *</label>
            <input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="BUBT" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Degree</label>
              <input className={inputCls} value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="B.Sc. in CSE" />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="CSE" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Session</label>
              <input className={inputCls} value={session} onChange={(e) => setSession(e.target.value)} placeholder="2022-23" />
            </div>
            <div>
              <label className={labelCls}>Grad. Year</label>
              <input className={inputCls} value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2026" />
            </div>
            <div>
              <label className={labelCls}>CGPA</label>
              <input className={inputCls} value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="3.80" />
            </div>
          </div>
        </div>
        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? "bg-[#16181c] text-[#8b98a5]" : "bg-slate-100 text-slate-700"}`}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm font-medium hover:bg-[#1677cc] disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

