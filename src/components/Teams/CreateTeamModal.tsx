import { useState } from "react";
import { X, Loader2, Upload } from "lucide-react";
import { Team, TeamCategory, TEAM_CATEGORY_LABELS } from "../../types/social";
import { createTeam, updateTeam } from "../../lib/api/teamsApi";
import { uploadImage } from "../../lib/storage";
import SkillsEditor, { CSE_SKILL_SUGGESTIONS } from "../Profile/SkillsEditor";

interface Props {
  currentUserId: string;
  onClose: () => void;
  onCreated: (team: Team) => void;
  isDarkMode: boolean;
}

export default function CreateTeamModal({ currentUserId, onClose, onCreated, isDarkMode }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState<TeamCategory>("academic_project");
  const [skills, setSkills] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState(5);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border outline-none ${
    isDarkMode
      ? "bg-[#16181c] border-[#38444d] text-[#e7e9ea] placeholder-[#71767b] focus:border-blue-500"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-blue-500"
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`;

  const save = async () => {
    if (name.trim().length < 3) {
      setError("Team name must be at least 3 characters.");
      return;
    }
    setSaving(true);
    setError("");

    const { team, error: err } = await createTeam({
      name: name.trim(),
      description: description.trim() || undefined,
      goal: goal.trim() || undefined,
      category,
      required_skills: skills,
      max_members: maxMembers,
      owner_id: currentUserId,
    });
    if (err || !team) {
      setSaving(false);
      setError(err ?? "Failed to create team.");
      return;
    }

    // Upload logo/banner after creation (needs team id for the storage path)
    try {
      const updates: { logo_url?: string; banner_url?: string } = {};
      if (logoFile) updates.logo_url = await uploadImage("team-assets", team.id, "logo", logoFile);
      if (bannerFile) updates.banner_url = await uploadImage("team-assets", team.id, "banner", bannerFile);
      if (Object.keys(updates).length) {
        await updateTeam(team.id, updates);
        Object.assign(team, updates);
      }
    } catch (e: any) {
      console.warn("Team image upload failed:", e?.message ?? e);
    }

    setSaving(false);
    onCreated(team);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isDarkMode ? "bg-[#17181c] border border-[#2f3336]" : "bg-white"}`}>
        <div className={`sticky top-0 px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200"}`}>
          <h2 className={`text-lg font-bold ${isDarkMode ? "text-[#e7e9ea]" : "text-slate-900"}`}>Create Team</h2>
          <button onClick={onClose} className={isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{error}</div>}

          <div>
            <label className={labelCls}>Team Name *</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CodeCrafters" maxLength={80} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as TeamCategory)}>
                {Object.entries(TEAM_CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Max Members (2-7)</label>
              <input
                type="number"
                min={2}
                max={7}
                className={inputCls}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.min(7, Math.max(2, parseInt(e.target.value || "5", 10))))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} min-h-[70px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this team about?" maxLength={1000} />
          </div>

          <div>
            <label className={labelCls}>Goal</label>
            <input className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Win the national hackathon 2026" maxLength={300} />
          </div>

          <div>
            <label className={labelCls}>Required Skills</label>
            <SkillsEditor
              items={skills}
              onChange={setSkills}
              isDarkMode={isDarkMode}
              badgeColor="emerald"
              placeholder="e.g. react, python…"
              suggestions={CSE_SKILL_SUGGESTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FilePick label="Team Logo" file={logoFile} onPick={setLogoFile} maxSizeMB={2} isDarkMode={isDarkMode} />
            <FilePick label="Cover Photo" file={bannerFile} onPick={setBannerFile} maxSizeMB={5} isDarkMode={isDarkMode} />
          </div>
        </div>

        <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-[#2f3336]" : "border-slate-200"}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? "bg-[#16181c] text-[#8b98a5]" : "bg-slate-100 text-slate-700"}`}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-[#e7e9ea] text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Team
          </button>
        </div>
      </div>
    </div>
  );
}

function FilePick({
  label,
  file,
  onPick,
  maxSizeMB,
  isDarkMode,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  maxSizeMB: number;
  isDarkMode: boolean;
}) {
  const [sizeError, setSizeError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (picked && picked.size > maxSizeMB * 1024 * 1024) {
      setSizeError(`Max ${maxSizeMB} MB`);
      e.target.value = "";
      return;
    }
    setSizeError("");
    onPick(picked);
  };

  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`}>
        {label} <span className={`font-normal ${isDarkMode ? "text-slate-500" : "text-[#71767b]"}`}>(max {maxSizeMB} MB)</span>
      </label>
      <label
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border cursor-pointer transition-colors ${
          sizeError
            ? "border-red-500 bg-red-500/5"
            : isDarkMode
            ? "bg-[#16181c] border-[#38444d] text-[#71767b] hover:border-blue-500"
            : "bg-white border-slate-300 text-slate-500 hover:border-blue-500"
        }`}
      >
        <Upload className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{file ? file.name : "Choose image…"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </label>
      {sizeError && <p className="mt-1 text-[10px] text-red-500">{sizeError}</p>}
    </div>
  );
}
