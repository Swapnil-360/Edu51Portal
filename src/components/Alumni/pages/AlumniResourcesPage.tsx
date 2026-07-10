import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, X, Globe, Lock, Trash2, Calendar, Loader2, FileText, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Props {
  isDarkMode: boolean;
  authSession: any;
  userProfile: any;
}

export default function AlumniResourcesPage({ isDarkMode, authSession, userProfile }: Props) {
  const currentUserId = authSession?.user?.id;

  // States
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Career Tips");
  const [department, setDepartment] = useState("All");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Style variables
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const selectCls = `px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors w-full ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 focus:border-[#1e9df1]"
  }`;
  const inputCls = `px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors w-full ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]"
  }`;

  // Fetch uploader's resources
  const fetchMyResources = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("alumni_resources")
        .select("*")
        .eq("alumni_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error("Error loading resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyResources();
  }, [currentUserId]);

  // Handle File Upload and Resource Creation
  const handleShareResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile || !currentUserId) {
      setFormError("Please fill out all required fields and select a file.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setFormError("File size must be under 10MB.");
        setSubmitting(false);
        return;
      }

      // Generate a unique path for the file in the bucket
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      // Upload file to Supabase storage bucket 'alumni-resources'
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("alumni-resources")
        .upload(filePath, selectedFile);

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("alumni-resources")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      // Insert resource row to database
      const { data: newResource, error: insertErr } = await supabase
        .from("alumni_resources")
        .insert({
          alumni_id: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          department,
          file_url: fileUrl,
          file_name: selectedFile.name,
          visibility,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Send notifications to connected mentees if resource is private
      if (visibility === "private") {
        const alumniName = userProfile?.name || "Your Mentor";
        const { data: conns } = await supabase
          .from("mentor_connections")
          .select("student_id")
          .eq("alumni_id", currentUserId);

        if (conns && conns.length > 0) {
          const notifications = conns.map((c) => ({
            user_id: c.student_id,
            type: "mentorship_resource",
            title: "New Resource from your Mentor",
            body: `${alumniName} shared '${title.trim()}' with you`,
            actor_id: currentUserId,
            actor_name: alumniName,
            read: false,
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }

      // Reset form and reload list
      setTitle("");
      setType("Career Tips");
      setDepartment("All");
      setDescription("");
      setVisibility("public");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowModal(false);
      fetchMyResources();
      alert("Resource shared successfully!");
    } catch (err: any) {
      console.error("Error sharing resource:", err);
      setFormError(err.message || "Failed to share resource. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Visibility of a Resource
  const handleToggleVisibility = async (id: string, currentVis: "public" | "private") => {
    try {
      const nextVis = currentVis === "public" ? "private" : "public";
      const { error } = await supabase
        .from("alumni_resources")
        .update({ visibility: nextVis })
        .eq("id", id);

      if (error) throw error;
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, visibility: nextVis } : r))
      );
    } catch (err) {
      console.error("Error toggling visibility:", err);
    }
  };

  // Delete Resource (remove DB row + remove file from Storage)
  const handleDeleteResource = async (resource: any) => {
    if (!window.confirm(`Are you sure you want to delete "${resource.title}"?`)) return;

    try {
      // 1. Delete from database
      const { error: dbErr } = await supabase
        .from("alumni_resources")
        .delete()
        .eq("id", resource.id);

      if (dbErr) throw dbErr;

      // 2. Extract path from file URL and delete from storage
      // e.g. publicUrl is of format: .../alumni-resources/auth_id/file_name.ext
      const pathParts = resource.file_url.split("/alumni-resources/");
      if (pathParts.length > 1) {
        const storagePath = decodeURIComponent(pathParts[1]);
        await supabase.storage.from("alumni-resources").remove([storagePath]);
      }

      // Reload
      fetchMyResources();
      alert("Resource deleted successfully!");
    } catch (err) {
      console.error("Error deleting resource:", err);
      alert("Failed to delete resource.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & Header */}
      <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cardBg}`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 ${textColor}`}>
            Shared Resources
          </h1>
          <p className={`text-sm ${subColor}`}>
            Upload guides, material, templates, and insights for current students.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          Share Resource
        </button>
      </div>

      {/* Resources list */}
      <div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#1e9df1]" />
            Loading resources...
          </div>
        ) : resources.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border ${cardBg}`}>
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-500" />
            <h3 className={`text-base font-bold mb-1 ${textColor}`}>No resources shared yet</h3>
            <p className={`text-xs max-w-xs mx-auto ${subColor}`}>
              Start sharing study materials, job guides, roadmap suggestions, or tips with the students!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((res) => (
              <div
                key={res.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${cardBg}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className={`font-bold text-sm leading-snug break-words ${textColor}`}>
                        {res.title}
                      </h4>
                      <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                        {res.type} · Dept: {res.department}
                      </p>
                    </div>

                    {/* Visibility Switcher Badge */}
                    <button
                      onClick={() => handleToggleVisibility(res.id, res.visibility)}
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        res.visibility === "public"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                      }`}
                      title="Click to toggle visibility"
                    >
                      {res.visibility === "public" ? (
                        <>
                          <Globe className="w-3 h-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Private (Mentees)
                        </>
                      )}
                    </button>
                  </div>

                  {res.description && (
                    <p className={`text-xs leading-relaxed italic truncate ${subColor}`}>
                      "{res.description}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-lg w-fit max-w-full">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-[11px]">{res.file_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#2f3336]/10 mt-1">
                  <span className={`text-[10px] flex items-center gap-1.5 ${subColor}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(res.created_at).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => handleDeleteResource(res)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md flex flex-col rounded-2xl border ${cardBg}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3336]/40">
              <h3 className={`font-bold text-base ${textColor}`}>Share a Resource</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError(null);
                }}
                className={`p-1.5 rounded-full hover:bg-slate-200/50 ${isDarkMode ? "hover:bg-[#2f3336] text-white" : "text-slate-600"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleShareResource} className="p-5 space-y-4">
              {formError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${textColor}`}>Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Resume Guide 2026"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${textColor}`}>Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                    <option value="Career Tips">Career Tips</option>
                    <option value="Job Guide">Job Guide</option>
                    <option value="Study Material">Study Material</option>
                    <option value="Industry Insight">Industry Insight</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${textColor}`}>Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={selectCls}
                  >
                    <option value="All">All</option>
                    <option value="CSE">CSE</option>
                    <option value="EEE">EEE</option>
                    <option value="BBA">BBA</option>
                    <option value="Civil">Civil</option>
                    <option value="Textile">Textile</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${textColor}`}>Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this resource..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${textColor}`}>Upload File (PDF/DOC/DOCX, max 10MB) *</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className={`text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:cursor-pointer ${textColor}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${textColor}`}>Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                      className="accent-[#1e9df1]"
                    />
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className={textColor}>Public (Everyone)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "private"}
                      onChange={() => setVisibility("private")}
                      className="accent-[#1e9df1]"
                    />
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span className={textColor}>Private (Mentees Only)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2f3336]/40 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Share Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
