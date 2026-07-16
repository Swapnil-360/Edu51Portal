import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Globe,
  Link as LinkIcon,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  MessageSquare,
} from "lucide-react";
import { SocialProfile, Education, Experience, Connection } from "../../types/social";
import { supabase } from "../../lib/supabase";
import MentorChat from "../Alumni/MentorChat";
import {
  getProfileById,
  getProfileByUsername,
  getLegacyProfilePic,
  listEducations,
  listExperiences,
  updateProfile,
} from "../../lib/api/profileApi";
import {
  sendConnectionRequest,
  respondToRequest,
  removeConnection,
  listMyConnections,
} from "../../lib/api/connectionsApi";
import { uploadImage } from "../../lib/storage";
import EditBasicInfoModal from "./EditBasicInfoModal";
import EducationSection from "./EducationSection";
import ExperienceSection from "./ExperienceSection";
import SkillsEditor, { BadgeList, CSE_SKILL_SUGGESTIONS, INTEREST_SUGGESTIONS } from "./SkillsEditor";

interface Props {
  /** username when viewing someone else via /u/:username; null = own profile */
  username: string | null;
  currentUserId: string | null;
  /** Cached avatar URL from App.tsx — shown immediately before the DB fetch completes */
  initialAvatarUrl?: string;
  /** Opens the admin dashboard — only rendered on the admin's own profile */
  onOpenAdmin?: () => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function ProfilePage({ username, currentUserId, initialAvatarUrl, onOpenAdmin, onClose, isDarkMode }: Props) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [legacyPic, setLegacyPic] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const isOwn = !!profile && !!currentUserId && profile.id === currentUserId;

  const [mentors, setMentors] = useState<any[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [chatTarget, setChatTarget] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (profile && !profile.is_alumni) {
      const fetchMentors = async () => {
        try {
          setLoadingMentors(true);
          const { data: conns, error: connErr } = await supabase
            .from("mentor_connections")
            .select("alumni_id")
            .eq("student_id", profile.id);

          if (cancelled) return;
          if (!connErr && conns && conns.length > 0) {
            const alumniIds = conns.map((c: any) => c.alumni_id);
            const { data: alumni, error: alumniErr } = await supabase
              .from("alumni_profiles")
              .select("id, full_name, job_title, company_name, major, graduation_year, avatar_url")
              .in("id", alumniIds);

            if (!cancelled && !alumniErr && alumni) {
              setMentors(alumni);
            }
          } else {
            setMentors([]);
          }
        } catch (err) {
          console.error("Error loading mentors:", err);
        } finally {
          if (!cancelled) setLoadingMentors(false);
        }
      };
      fetchMentors();
    }
    return () => { cancelled = true; };
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let p: SocialProfile | null = null;

        // Timeout safety — if Supabase hangs, bail after 10 s
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000));

        if (username) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
          if (isUuid) {
            p = await Promise.race([getProfileById(username), timeout]);
          } else {
            p = await Promise.race([getProfileByUsername(username), timeout]);
          }
        } else if (currentUserId) {
          p = await Promise.race([getProfileById(currentUserId), timeout]);
        }

        if (cancelled) return;

        const legacyFetch = p && !p.avatar_url ? getLegacyProfilePic(p.id) : Promise.resolve(null);
        setProfile(p);

        if (p) {
          legacyFetch.then((pic) => { if (!cancelled && pic) setLegacyPic(pic); });
          listEducations(p.id).then((eds) => { if (!cancelled) setEducations(eds); });
          listExperiences(p.id).then((exps) => { if (!cancelled) setExperiences(exps); });
          if (currentUserId) {
            listMyConnections(currentUserId).then((conns) => {
              if (cancelled) return;
              setConnectionCount(conns.filter((c) => c.status === "accepted").length);
              if (p && p.id !== currentUserId) {
                setConnection(
                  conns.find(
                    (c) => c.requester_id === p!.id || c.addressee_id === p!.id,
                  ) ?? null,
                );
              }
            });
          }
        }
      } catch (e) {
        console.error("ProfilePage load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [username, currentUserId]);

  const refreshProfile = async () => {
    if (!profile) return;
    const p = await Promise.race([
      getProfileById(profile.id),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
    if (p) setProfile(p);
  };

  const handleImageUpload = async (kind: "avatar" | "cover", file: File) => {
    if (!profile || !isOwn) return;
    const MAX = kind === "cover" ? 5 : 2;
    if (file.size > MAX * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX} MB.`);
      return;
    }
    setUploadError(null);
    setBusy(true);
    try {
      const url = await uploadImage("avatars", profile.id, kind, file);
      await updateProfile(profile.id, kind === "avatar" ? { avatar_url: url } : { cover_photo_url: url });
      if (kind === "avatar") {
        localStorage.setItem("userProfilePic", url);
        localStorage.setItem("userProfileAvatarUrl", url);
      }
      await refreshProfile();
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed. Please try again.");
      console.error("Image upload failed:", e?.message ?? e);
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    if (!profile || !currentUserId) return;
    setBusy(true);
    if (!connection || connection.status === "rejected") {
      await sendConnectionRequest(currentUserId, profile.id);
    } else if (connection.status === "pending" && connection.addressee_id === currentUserId) {
      await respondToRequest(connection.id, true);
    } else {
      await removeConnection(connection.id);
    }
    const conns = await listMyConnections(currentUserId);
    setConnection(conns.find((c) => c.requester_id === profile.id || c.addressee_id === profile.id) ?? null);
    setBusy(false);
  };

  const saveTags = async (field: "skills" | "interests", items: string[]) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: items });
    await updateProfile(profile.id, { [field]: items });
  };

  const pageBg = isDarkMode ? "bg-[#000000]" : "bg-slate-100";
  const card = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200";
  const titleCls = isDarkMode ? "text-[#e7e9ea]" : "text-slate-900";
  const sub = isDarkMode ? "text-[#71767b]" : "text-slate-500";

  if (loading) {
    const skBg = isDarkMode ? "bg-[#16181c]/60" : "bg-slate-200/70";
    return (
      <div className={`min-h-screen ${pageBg}`}>
        {/* Cover skeleton */}
        <div className={`relative h-48 animate-pulse ${isDarkMode ? "bg-[#16181c]" : "bg-slate-200"}`} />
        {/* Avatar + content skeleton */}
        <div className="max-w-3xl mx-auto px-4 -mt-12 pb-12">
          {/* Avatar row */}
          <div className="flex items-end gap-4 mb-6">
            <div className={`w-24 h-24 rounded-full border-4 flex-shrink-0 overflow-hidden animate-pulse ${isDarkMode ? "border-[#000000] bg-[#2f3336]" : "border-slate-100 bg-slate-300"}`}>
              {initialAvatarUrl && (
                <img src={initialAvatarUrl} alt="" className="w-full h-full object-cover" fetchpriority="high" decoding="async" />
              )}
            </div>
            <div className="mb-2 flex-1 space-y-2.5">
              <div className={`h-5 w-44 rounded-lg animate-pulse ${skBg}`} />
              <div className={`h-3 w-28 rounded animate-pulse ${skBg}`} />
              <div className={`h-3 w-36 rounded animate-pulse ${skBg}`} />
            </div>
          </div>
          {/* Stats row skeleton */}
          <div className="flex gap-3 mb-5">
            {[80, 96, 72].map((w, i) => (
              <div key={i} className={`h-16 rounded-xl flex-1 animate-pulse ${skBg}`} />
            ))}
          </div>
          {/* Bio skeleton */}
          <div className={`h-24 rounded-2xl animate-pulse mb-4 ${skBg}`} />
          {/* Skills skeleton */}
          <div className={`h-20 rounded-2xl animate-pulse mb-4 ${skBg}`} />
          {/* Education skeleton */}
          <div className={`h-28 rounded-2xl animate-pulse ${skBg}`} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${pageBg}`}>
        <p className={titleCls}>Profile not found.</p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm">
          Go Back
        </button>
      </div>
    );
  }

  // Privacy gate (RLS already protects child tables; this gates the page shell)
  if (!isOwn && profile.visibility === "private") {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${pageBg}`}>
        <Lock className={`w-10 h-10 ${sub}`} />
        <p className={titleCls}>This profile is private.</p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const avatarSrc = profile.avatar_url || legacyPic || initialAvatarUrl || "";
  const showConnect = !connection || connection.status === "rejected";
  const connectLabel = showConnect
    ? "Connect"
    : connection.status === "accepted"
      ? "Connected"
      : connection.addressee_id === currentUserId
        ? "Accept Request"
        : "Request Sent";
  const ConnectIcon = showConnect ? UserPlus : connection.status === "accepted" ? UserCheck : connection.addressee_id === currentUserId ? UserCheck : UserX;

  return (
    <div className={`min-h-screen pb-32 md:pb-20 ${pageBg}`}>
      <style>{`
        @keyframes flagWave { 0%,100%{transform:rotate(-8deg) scale(1)} 50%{transform:rotate(8deg) scale(1.15)} }
        @keyframes wcPop    { 0%{transform:scale(1) rotate(0deg)} 30%{transform:scale(1.35) rotate(-10deg)} 60%{transform:scale(1.3) rotate(8deg)} 80%{transform:scale(1.2) rotate(-4deg)} 100%{transform:scale(1.25) rotate(0deg)} }
        .wc-logo { animation: flagWave 2s ease-in-out infinite; transition: filter 0.2s; }
        .wc-logo:hover { animation: wcPop 0.5s ease forwards; filter: drop-shadow(0 0 6px rgba(34,197,94,0.8)) drop-shadow(0 0 12px rgba(250,204,21,0.5)); cursor: pointer; }
      `}</style>
      {/* Top bar */}

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-4">
        {uploadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-3 text-red-400 hover:text-red-300">×</button>
          </div>
        )}
        {/* Header card */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          {/* Cover */}
          <div className="relative h-36 sm:h-48 bg-gradient-to-r from-[#1e9df1] to-[#1677cc]">
            {profile.cover_photo_url && (
              <img src={profile.cover_photo_url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" fetchpriority="high" decoding="async" />
            )}
            {isOwn && (
              <button
                onClick={() => coverInput.current?.click()}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-[#e7e9ea] hover:bg-black/70"
                title="Change cover photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-5 pb-5">
            {/* Avatar */}
            <div className="relative -mt-12 mb-3 w-24 h-24">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${isDarkMode ? "border-[#000000] bg-[#16181c]" : "border-white bg-slate-200"}`}>
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchpriority="high"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br from-[#1e9df1] to-[#1677cc]">
                    {profile.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              {isOwn && (
                <button
                  onClick={() => avatarInput.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#1e9df1] text-white hover:bg-[#1677cc] shadow"
                  title="Change photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-xl font-bold ${titleCls}`}>{profile.name}</h2>
                </div>
                {profile.username && <p className={`text-sm ${sub}`}>@{profile.username}</p>}
                {profile.headline && (
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>{profile.headline}</p>
                )}
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs ${sub}`}>
                  {profile.section && <span>{profile.section}</span>}
                  {profile.major && <span>· {profile.major}</span>}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>
                  )}
                  {isOwn && (
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{connectionCount} connection{connectionCount === 1 ? "" : "s"}</span>
                  )}
                </div>
                {/* Links */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#1e9df1] hover:underline">
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                  {Object.entries(profile.social_links ?? {}).map(([k, v]) => (
                    <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline capitalize">
                      <LinkIcon className="w-3 h-3" /> {k}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                {isOwn && profile.is_admin && onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-[#e7e9ea] text-sm font-medium hover:bg-amber-600 flex items-center gap-2 shadow-sm"
                    title="Open the admin dashboard"
                  >
                    <ShieldCheck className="w-4 h-4" /> Admin Dashboard
                  </button>
                )}
                {isOwn ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-lg bg-[#1e9df1] text-white text-sm font-medium hover:bg-[#1677cc] flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" /> Edit Profile
                  </button>
                ) : currentUserId ? (
                  <button
                    onClick={handleConnect}
                    disabled={busy || (connection?.status === "pending" && connection.requester_id === currentUserId)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      connection?.status === "accepted"
                        ? isDarkMode
                          ? "bg-[#16181c] text-emerald-400 border border-emerald-700/50"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-[#1e9df1] text-white hover:bg-[#1677cc] disabled:opacity-60"
                    }`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ConnectIcon className="w-4 h-4" />}
                    {connectLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {(isOwn || profile.about) && (
          <section className={`rounded-2xl border p-5 ${card}`}>
            <h3 className={`text-base font-bold mb-2 ${titleCls}`}>About</h3>
            {profile.about ? (
              <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? "text-[#8b98a5]" : "text-slate-700"}`}>{profile.about}</p>
            ) : (
              <p className={`text-sm ${sub}`}>
                Tell people about yourself —{" "}
                <button onClick={() => setShowEditModal(true)} className="text-[#1e9df1] hover:underline">add an about section</button>.
              </p>
            )}
          </section>
        )}

        {/* Skills */}
        <section className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base font-bold ${titleCls}`}>Skills</h3>
            {isOwn && (
              <button
                onClick={() => setEditingSkills(!editingSkills)}
                className="text-xs text-blue-500 hover:underline"
              >
                {editingSkills ? "Done" : "Edit"}
              </button>
            )}
          </div>
          {editingSkills ? (
            <SkillsEditor
              items={profile.skills}
              onChange={(items) => saveTags("skills", items)}
              isDarkMode={isDarkMode}
              suggestions={CSE_SKILL_SUGGESTIONS}
            />
          ) : (
            <BadgeList items={profile.skills} isDarkMode={isDarkMode} emptyText={isOwn ? "Add skills so teams can find you." : "No skills listed."} />
          )}
        </section>

        {/* Interests */}
        <section className={`rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base font-bold ${titleCls}`}>Interests</h3>
            {isOwn && (
              <button
                onClick={() => setEditingInterests(!editingInterests)}
                className="text-xs text-blue-500 hover:underline"
              >
                {editingInterests ? "Done" : "Edit"}
              </button>
            )}
          </div>
          {editingInterests ? (
            <SkillsEditor
              items={profile.interests}
              onChange={(items) => saveTags("interests", items)}
              isDarkMode={isDarkMode}
              badgeColor="blue"
              placeholder="Add an interest…"
              suggestions={INTEREST_SUGGESTIONS}
            />
          ) : (
            <BadgeList items={profile.interests} isDarkMode={isDarkMode} badgeColor="blue" emptyText={isOwn ? "Add interests like AI, Research, Web Development…" : "No interests listed."} />
          )}
        </section>

        <EducationSection userId={profile.id} educations={educations} isOwn={isOwn} isDarkMode={isDarkMode} onChanged={() => listEducations(profile.id).then(setEducations)} />
        <ExperienceSection userId={profile.id} experiences={experiences} isOwn={isOwn} isDarkMode={isDarkMode} onChanged={() => listExperiences(profile.id).then(setExperiences)} />

        {/* My Mentors Section */}
        {profile && !profile.is_alumni && (
          <section className={`rounded-2xl border p-5 ${card}`}>
            <h3 className={`text-base font-bold mb-4 ${titleCls}`}>My Mentors</h3>
            {loadingMentors ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-[#1e9df1]" />
                Loading mentors...
              </div>
            ) : mentors.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className={`text-sm ${sub}`}>No mentors yet. Browse Alumni Hub to find a mentor.</p>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg bg-[#1e9df1]/10 text-[#1e9df1] hover:bg-[#1e9df1]/20 text-xs font-semibold cursor-pointer"
                  >
                    Browse Alumni Hub
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className={`p-4 rounded-xl border flex gap-3 items-center justify-between ${
                      isDarkMode ? "bg-slate-900/40 border-[#2f3336]/40" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-blue-500/30 flex-shrink-0 bg-slate-800">
                        {mentor.avatar_url ? (
                          <img src={mentor.avatar_url} alt={mentor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-blue-600">
                            {mentor.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${titleCls}`}>{mentor.full_name}</p>
                        <p className={`text-xs truncate ${sub}`}>
                          {mentor.job_title} {mentor.company_name ? `at ${mentor.company_name}` : ""}
                        </p>
                        <p className="text-[10px] text-purple-400 font-medium">
                          {mentor.major} · Class of {mentor.graduation_year}
                        </p>
                      </div>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => setChatTarget(mentor)}
                        className="p-2 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 cursor-pointer flex-shrink-0"
                        title="Chat with Mentor"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* hidden file inputs */}
      <input
        ref={avatarInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload("avatar", f);
          e.target.value = "";
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload("cover", f);
          e.target.value = "";
        }}
      />

      {showEditModal && (
        <EditBasicInfoModal
          profile={profile}
          isDarkMode={isDarkMode}
          onClose={() => setShowEditModal(false)}
          onSaved={refreshProfile}
        />
      )}
      {chatTarget && (
        <MentorChat
          isDarkMode={isDarkMode}
          currentUserId={currentUserId}
          currentUserProfile={profile}
          targetUserId={chatTarget.id}
          targetUserName={chatTarget.full_name}
          targetUserAvatar={chatTarget.avatar_url}
          isTargetAlumni={true}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  );
}
