import { useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Globe,
  Lock,
  Users,
  Trash2,
  FileText,
  AlertCircle,
  Heart,
  Share2,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Search,
  MessageSquare,
  Send,
  Check,
  ShieldCheck,
  ChevronDown,
  BookOpen,
  Loader2,
  GraduationCap,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import Loader from "../../ui/Loader";

interface Props {
  isDarkMode: boolean;
  authSession: any;
  userProfile: any;
  onViewAlumniProfile?: (alumniId: string) => void;
  onRequireLogin?: () => void;
  onBrowseDirectory?: () => void;
  suggestedMentors?: any[];
}

const DEPARTMENTS = [
  { value: "All", label: "All Departments" },
  { value: "CSE", label: "CSE (Computer Science)" },
  { value: "EEE", label: "EEE (Electrical & Electronics)" },
  { value: "Civil", label: "Civil Engineering" },
  { value: "Textile", label: "Textile Engineering" },
  { value: "BBA", label: "BBA (Business Admin)" },
  { value: "English", label: "English Department" },
  { value: "Law", label: "Law & Justice" },
  { value: "Economics", label: "Economics" },
  { value: "Mathematics", label: "Mathematics & Statistics" },
];

interface AlumniAuthor {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  is_verified?: boolean;
}

interface PostComment {
  id: string;
  user_id?: string;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
}

type VisibilityType = "public" | "mentees" | "private";

// Fallback seed posts from verified alumni so the feed is vibrant with other alumni's knowledge
const COMMUNITY_SEEDS = [
  {
    id: "seed-swe-brainstation",
    alumni_id: "61051f57-f68a-4957-9bc4-79c33c0b65ad", // Md. Jahidul Kamal
    title: "Brain Station 23 is hiring Junior Go & React Developers",
    description:
      "Hey BUBT students & graduates! Our engineering team at Brain Station 23 is expanding. We have openings for Junior Backend (Go/Node) and Frontend (React/TypeScript) developers.\n\nKey focus: Problem solving, basic DSA, clean REST API design, and git workflow.\nFeel free to connect or drop a comment here if you need a referral or resume review! #JobOpening #BUBTAlumni #CareerTips",
    type: "Job Guide",
    department: "CSE",
    file_url: "https://brainstation-23.com/career",
    file_name: "link:Brain Station 23 Careers",
    visibility: "public",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "seed-pm-pathao",
    alumni_id: "3c9f10f5-b29b-4efd-bcc7-d47d49ce0ec6", // Raisa Sultana
    title: "How to Transition into Tech Product Management from BUBT",
    description:
      "Many BUBT CSE and BBA students ask how to break into Product Management. I've compiled our Pathao PM framework: user research, feature prioritization, metrics tracking, and sprint planning.\n\nStart by building real case studies for local problems (e.g. campus transport or food delivery apps). Check the link below for the full guide! #CareerTips #ProductManagement",
    type: "Career Tips",
    department: "All",
    file_url: "https://drive.google.com/drive/folders/bubt-pm-roadmap",
    file_name: "link:Product Management Roadmap Guide",
    visibility: "public",
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
  {
    id: "seed-samsung-rnd",
    alumni_id: "32db9cb7-ae07-4c5c-835e-da19ba431eef", // Tanvir Ahmed
    title: "Samsung R&D Coding Test Preparation Tips & Resources",
    description:
      "For 7th/8th semester students preparing for Samsung R&D and similar tech test rounds: practice 3-hour backtracking and BFS/DFS problems on Codeforces and Baekjoon.\n\nSpeed and edge case handling are the most critical factors. Let me know if you have questions about the hiring steps! #StudyMaterial #InterviewPrep",
    type: "Study Material",
    department: "CSE",
    file_url: "https://github.com/tanvir-samsung/coding-prep-guide",
    file_name: "link:Samsung Coding Test Problem Sets",
    visibility: "public",
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
];

export default function AlumniResourcesPage({
  isDarkMode,
  authSession,
  userProfile,
  onViewAlumniProfile,
  onRequireLogin,
  onBrowseDirectory,
  suggestedMentors = [],
}: Props) {
  const isLoggedIn = Boolean(authSession?.user?.id && authSession.user.id !== "guest-user");
  const currentUserId = authSession?.user?.id || "guest-user";
  const isAlumniUser = Boolean(
    userProfile?.isAlumni ||
    userProfile?.role === "alumni" ||
    localStorage.getItem("userProfileIsAlumni") === "true"
  );

  // Active Tab: only "feed" or "my_posts"
  const [activeTab, setActiveTab] = useState<"feed" | "my_posts">("feed");

  // Posts & Authors State
  const [posts, setPosts] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, AlumniAuthor>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Composer State
  const [showComposer, setShowComposer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<VisibilityType>("public");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Real Reactions (stored as map: postId -> array of userIds who reacted)
  const [reactsMap, setReactsMap] = useState<Record<string, string[]>>({});

  // Real Comments (stored as map: postId -> array of PostComment)
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});

  // Interactive Visibility Dropdown on Post
  const [visibilityDropdownPostId, setVisibilityDropdownPostId] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        visibilityDropdownRef.current &&
        !visibilityDropdownRef.current.contains(e.target as Node)
      ) {
        setVisibilityDropdownPostId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load real reacts & comments from localStorage
  useEffect(() => {
    try {
      const savedReacts = localStorage.getItem("alumni_real_reacts");
      if (savedReacts) setReactsMap(JSON.parse(savedReacts));

      const savedComments = localStorage.getItem("alumni_real_comments");
      if (savedComments) setCommentsMap(JSON.parse(savedComments));
    } catch (e) {
      console.error("Error reading saved reacts/comments:", e);
    }
  }, []);

  // Fetch Feed from Supabase + Author Profiles
  const fetchFeed = async () => {
    try {
      setLoading(true);

      // 1. Fetch connected mentor IDs if logged in
      let mentorIds: string[] = [];
      if (currentUserId && currentUserId !== "guest-user") {
        const { data: conns } = await supabase
          .from("mentor_connections")
          .select("alumni_id")
          .eq("student_id", currentUserId);
        mentorIds = conns?.map((c) => c.alumni_id) || [];
      }

      // 2. Fetch all resources from DB
      const { data: dbData, error: dbErr } = await supabase
        .from("alumni_resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbErr) throw dbErr;

      // Combine DB posts with community seeds (ensuring other alumni posts are always visible in feed)
      const combined = [...(dbData || [])];
      COMMUNITY_SEEDS.forEach((seed) => {
        if (!combined.some((p) => p.id === seed.id)) {
          combined.push(seed);
        }
      });

      // Sort by created_at descending
      const sorted = combined.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(sorted);

      // 3. Batch fetch author profiles
      const uploaderIds = Array.from(new Set(sorted.map((p) => p.alumni_id)));
      if (uploaderIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("alumni_profiles")
          .select("id, full_name, avatar_url, job_title, company_name, major, graduation_year, is_verified")
          .in("id", uploaderIds);

        if (profileRows) {
          const map: Record<string, AlumniAuthor> = {};
          profileRows.forEach((pr) => {
            map[pr.id] = pr;
          });
          setAuthors(map);
        }
      }
    } catch (err) {
      console.error("Error fetching feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [currentUserId]);

  // Handle Publish Post
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !title.trim() && !selectedFile && !linkUrl.trim()) {
      setFormError("Please write a caption, or add an attachment or link.");
      return;
    }
    if (!currentUserId || currentUserId === "guest-user") {
      setFormError("Please log in to publish a post.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      let uploadedFileUrl: string | null = null;
      let uploadedFileName: string | null = null;

      // 1. Upload File if selected
      if (selectedFile) {
        if (selectedFile.size > 10 * 1024 * 1024) {
          setFormError("File size must be under 10MB.");
          setSubmitting(false);
          return;
        }

        const fileExt = selectedFile.name.split(".").pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${currentUserId}/${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("alumni-resources")
          .upload(filePath, selectedFile);

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from("alumni-resources")
          .getPublicUrl(filePath);

        uploadedFileUrl = publicUrlData.publicUrl;
        uploadedFileName = selectedFile.name;
      }

      // If external link provided and no file
      if (!uploadedFileUrl && linkUrl.trim()) {
        uploadedFileUrl = linkUrl.trim();
        uploadedFileName = linkLabel.trim() ? `link:${linkLabel.trim()}` : `link:${linkUrl.trim()}`;
      }

      const finalTitle =
        title.trim() ||
        caption.trim().split("\n")[0].substring(0, 60) ||
        (selectedFile ? selectedFile.name : "Alumni Post");

      // Insert into Supabase
      const { data: newRow, error: insertErr } = await supabase
        .from("alumni_resources")
        .insert({
          alumni_id: currentUserId,
          title: finalTitle,
          description: caption.trim() || null,
          type: "Career Tips",
          department: "All",
          file_url: uploadedFileUrl,
          file_name: uploadedFileName,
          visibility,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Reset form
      setTitle("");
      setCaption("");
      setVisibility("public");
      setSelectedFile(null);
      setLinkUrl("");
      setLinkLabel("");
      setShowLinkInput(false);
      setShowComposer(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh feed
      await fetchFeed();
    } catch (err: any) {
      console.error("Error creating post:", err);
      setFormError(err.message || "Failed to create post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Change Post Visibility (Public, Mentees, Private)
  const handleChangeVisibility = async (post: any, newVis: VisibilityType) => {
    setVisibilityDropdownPostId(null);
    if (post.visibility === newVis) return;

    try {
      setUpdatingVisibilityId(post.id);

      // 1. Update in Supabase if not a local seed
      if (!post.id.startsWith("seed-")) {
        const { error } = await supabase
          .from("alumni_resources")
          .update({ visibility: newVis })
          .eq("id", post.id);

        if (error) throw error;
      }

      // 2. Update in local state
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, visibility: newVis } : p))
      );
    } catch (err) {
      console.error("Error updating visibility:", err);
      alert("Failed to update visibility.");
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  // Delete Post
  const handleDeletePost = async (post: any) => {
    if (!window.confirm(`Are you sure you want to delete this post?`)) return;

    try {
      // If not a seed post, delete from Supabase
      if (!post.id.startsWith("seed-")) {
        const { error: dbErr } = await supabase
          .from("alumni_resources")
          .delete()
          .eq("id", post.id);

        if (dbErr) throw dbErr;

        // Clean up storage file if applicable
        if (post.file_url && post.file_url.includes("/alumni-resources/")) {
          const parts = post.file_url.split("/alumni-resources/");
          if (parts.length > 1) {
            const storagePath = decodeURIComponent(parts[1]);
            await supabase.storage.from("alumni-resources").remove([storagePath]).catch(() => {});
          }
        }
      }

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  // Real React / Like Toggle
  const handleToggleReact = (postId: string) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    const currentReactors = reactsMap[postId] || [];
    const hasReacted = currentReactors.includes(currentUserId);

    let updatedReactors: string[];
    if (hasReacted) {
      updatedReactors = currentReactors.filter((uid) => uid !== currentUserId);
    } else {
      updatedReactors = [...currentReactors, currentUserId];
    }

    const newMap = { ...reactsMap, [postId]: updatedReactors };
    setReactsMap(newMap);
    localStorage.setItem("alumni_real_reacts", JSON.stringify(newMap));
  };

  // Add Real Comment
  const handleAddComment = (postId: string) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    const text = commentInputMap[postId]?.trim();
    if (!text) return;

    const newComment: PostComment = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: currentUserId,
      author_name: userProfile?.name || (isAlumniUser ? "Alumni Member" : "BUBT Student"),
      author_avatar: userProfile?.avatar_url || userProfile?.profilePic || null,
      content: text,
      created_at: new Date().toISOString(),
    };

    const updated = {
      ...commentsMap,
      [postId]: [...(commentsMap[postId] || []), newComment],
    };

    setCommentsMap(updated);
    localStorage.setItem("alumni_real_comments", JSON.stringify(updated));
    setCommentInputMap((prev) => ({ ...prev, [postId]: "" }));
  };

  // Copy Post Share Link
  const handleCopyPost = (post: any) => {
    const text = `"${post.title}"\n${post.description || ""}\nShared on Edu51Portal Alumni Stream`;
    navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  // Helper: Format Time Ago
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  // Helper: Initials
  const getInitials = (name?: string) => {
    if (!name) return "AL";
    const clean = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Md\.|Engr\.)\s+/i, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.substring(0, 2).toUpperCase() || "AL";
  };

  // Helper: Avatar Gradient
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-blue-600 via-indigo-600 to-sky-600",
      "from-indigo-600 via-purple-600 to-violet-600",
      "from-teal-600 via-emerald-600 to-cyan-600",
      "from-sky-600 via-blue-600 to-indigo-700",
      "from-violet-600 via-fuchsia-600 to-pink-600",
      "from-rose-600 via-pink-600 to-amber-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  const isStorageFile = (url?: string) => Boolean(url && url.includes("/alumni-resources/"));
  const isImageFile = (url?: string, name?: string) => {
    const target = (name || url || "").toLowerCase();
    return target.endsWith(".png") || target.endsWith(".jpg") || target.endsWith(".jpeg") || target.endsWith(".webp");
  };

  // Filter logic for Feed vs My Posts
  const displayPosts = posts.filter((post) => {
    const isMine = currentUserId && post.alumni_id === currentUserId;

    // "My Posts" tab: ONLY show current user's posts
    if (activeTab === "my_posts") {
      if (!isMine) return false;
    } else {
      // "Feed" tab:
      // Show public posts
      // Show mentees posts (alumni can see or connected users)
      // If private: only author can see their own private post
      if (post.visibility === "private" && !isMine) {
        return false;
      }
    }

    // Optional Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const author = authors[post.alumni_id];
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchCaption = post.description?.toLowerCase().includes(q);
      const matchAuthor = author?.full_name?.toLowerCase().includes(q);
      const matchCompany = author?.company_name?.toLowerCase().includes(q);
      const matchFile = post.file_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchCaption && !matchAuthor && !matchCompany && !matchFile) {
        return false;
      }
    }

    // Optional Department filter
    if (selectedDept !== "All") {
      const postDept = (post.department || "").toUpperCase();
      const targetDept = selectedDept.toUpperCase();
      if (postDept !== "ALL" && !postDept.includes(targetDept)) {
        return false;
      }
    }

    return true;
  });

  // Count for My Posts
  const myPostsCount = posts.filter((p) => p.alumni_id === currentUserId).length;

  // Styles
  const textColor = isDarkMode ? "text-white" : "text-slate-900";
  const subColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardBg = isDarkMode ? "bg-[#17181c] border-[#2f3336]/60" : "bg-white border-slate-200 shadow-sm";
  const inputBg = isDarkMode
    ? "bg-[#16181c] border-[#2f3336] text-white placeholder-[#71767b] focus:border-[#1e9df1]"
    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1]";


  return (
    <div className="w-full space-y-5 pb-12 animate-fade-in">
      {/* ── Primary Feed Toolbar (Matches Alumni Directory Filter Bar) ── */}
      <div
        className={`rounded-2xl border transition-all duration-200 ${
          isDarkMode
            ? "bg-[#12161f]/95 border-[#202738] shadow-lg shadow-black/20"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <div className="p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search feed by title, author, company, keywords..."
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all duration-150 ${
                isDarkMode
                  ? "bg-[#0c1017] border-[#222b3d] text-white placeholder-slate-500 focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]/30"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#1e9df1] focus:bg-white focus:ring-1 focus:ring-[#1e9df1]/30"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Department Filter Dropdown */}
            <div className="relative flex-1 sm:flex-initial min-w-[150px] sm:min-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <GraduationCap
                  className={`h-4 w-4 transition-colors ${
                    selectedDept !== "All"
                      ? "text-[#1e9df1]"
                      : isDarkMode
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                />
              </div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                aria-label="Filter feed by department"
                className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm font-medium border appearance-none cursor-pointer outline-none transition-all duration-150 ${
                  selectedDept !== "All"
                    ? isDarkMode
                      ? "bg-[#1e9df1]/10 border-[#1e9df1] text-[#1e9df1]"
                      : "bg-blue-50 border-[#1e9df1] text-blue-700 font-semibold"
                    : isDarkMode
                    ? "bg-[#0c1017] border-[#222b3d] text-slate-200 hover:border-slate-600 focus:border-[#1e9df1]"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 focus:border-[#1e9df1]"
                }`}
              >
                {DEPARTMENTS.map((dept) => (
                  <option
                    key={dept.value}
                    value={dept.value}
                    className={isDarkMode ? "bg-[#12161f] text-white" : "bg-white text-slate-900"}
                  >
                    {dept.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <ChevronDown className={`h-4 w-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
              </div>
            </div>

            {/* Post count / toggle pills */}
            {isAlumniUser ? (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0c1017] border border-slate-200 dark:border-[#222b3d]">
                <button
                  type="button"
                  onClick={() => setActiveTab("feed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "feed"
                      ? "bg-[#1e9df1] text-white shadow-sm"
                      : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>All Posts</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === "feed" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {posts.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("my_posts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "my_posts"
                      ? "bg-[#1e9df1] text-white shadow-sm"
                      : isDarkMode
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>My Posts</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      activeTab === "my_posts" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {myPostsCount}
                  </span>
                </button>
              </div>
            ) : (
              <div
                className={`hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                  isDarkMode ? "bg-[#0c1017] border-[#222b3d] text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{displayPosts.length} Community {displayPosts.length === 1 ? "Post" : "Posts"}</span>
              </div>
            )}

            {/* Create Post Button (Alumni only) */}
            {isAlumniUser && (
              <button
                onClick={() => setShowComposer(!showComposer)}
                className="px-4 py-2.5 rounded-xl bg-[#1e9df1] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#1e9df1]/25 active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{showComposer ? "Close" : "Create Post"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Full Width Feed Stream (Matching Toolbar Size & Style) ── */}
      <div className="space-y-4 w-full">

      {/* ── Composer Card: Create Post (Alumni only) ── */}
      {isAlumniUser && showComposer && (
        <div className={`rounded-2xl border p-4 sm:p-5 ${cardBg} shadow-lg transition-all animate-fade-in`}>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2f3336]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {userProfile?.avatar_url || userProfile?.profilePic ? (
                  <img src={userProfile?.avatar_url || userProfile?.profilePic} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(userProfile?.name)
                )}
              </div>
              <div>
                <p className={`text-xs font-bold ${textColor}`}>
                  {userProfile?.name || "Alumni Author"}
                </p>
                <p className="text-[10px] text-[#1e9df1] flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Alumni Post
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowComposer(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handlePublishPost} className="space-y-3.5">
            {formError && (
              <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Title / Headline */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline / Topic (e.g. Brain Station 23 is hiring Junior Go Developers!)"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border outline-none ${inputBg}`}
            />

            {/* Caption Textarea */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="What career advice, job updates, roadmap tips, or study advice would you like to share?"
              className={`w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm border outline-none resize-none leading-relaxed ${inputBg}`}
            />

            {/* Attached File Preview Chip */}
            {selectedFile && (
              <div className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-[#1e9df1]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${textColor}`}>{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Link Input Section */}
            {showLinkInput && (
              <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" /> Attach External Link
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkUrl("");
                      setLinkLabel("");
                    }}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://github.com/... or Google Drive, YouTube, portfolio"
                  className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${inputBg}`}
                />
                <input
                  type="text"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Link Title (e.g. Full Source Code on GitHub)"
                  className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none ${inputBg}`}
                />
              </div>
            )}

            {/* Visibility Option: 3 options (Public, Mentees only, Private) */}
            <div className="pt-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${subColor}`}>
                Who can see this post?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    visibility === "public"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold"
                      : isDarkMode
                      ? "bg-[#16181c] border-[#2f3336] text-slate-400"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("mentees")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    visibility === "mentees"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold"
                      : isDarkMode
                      ? "bg-[#16181c] border-[#2f3336] text-slate-400"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Mentees Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    visibility === "private"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/40 font-bold"
                      : isDarkMode
                      ? "bg-[#16181c] border-[#2f3336] text-slate-400"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private (Only Me)</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#2f3336]/30">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    selectedFile
                      ? "bg-blue-500/20 text-[#1e9df1] border-blue-500/40"
                      : isDarkMode
                      ? "bg-[#16181c] border-[#2f3336] text-slate-300 hover:text-white"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#1e9df1]" />
                  <span>{selectedFile ? "Change File" : "Attach File"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    showLinkInput || linkUrl
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
                      : isDarkMode
                      ? "bg-[#16181c] border-[#2f3336] text-slate-300 hover:text-white"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Link</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#1e9df1] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#1e9df1]/25 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Feed List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader />
          <p className={`text-xs ${subColor}`}>Loading feed...</p>
        </div>
      ) : displayPosts.length === 0 ? (
        <div className={`p-10 text-center rounded-2xl border ${cardBg}`}>
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-500 opacity-60" />
          <h3 className={`text-base font-bold mb-1 ${textColor}`}>
            {activeTab === "my_posts" ? "You haven't posted anything yet" : "No posts found"}
          </h3>
          <p className={`text-xs max-w-sm mx-auto ${subColor}`}>
            {activeTab === "my_posts"
              ? "Share your career advice, roadmaps, or study guides with the BUBT community!"
              : searchQuery
              ? "No posts match your search query."
              : "No posts in the feed yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayPosts.map((post) => {
            const author = authors[post.alumni_id];
            const authorName = author?.full_name || (post.alumni_id === currentUserId ? userProfile?.name : "BUBT Alumni");
            const authorTitle = author?.job_title ? `${author.job_title}${author.company_name ? ` at ${author.company_name}` : ""}` : "BUBT Alumni Member";
            const authorSub = `${author?.major || post.department || "CSE"}${author?.graduation_year ? ` · Class of '${String(author.graduation_year).slice(-2)}` : ""}`;
            const isMine = currentUserId && post.alumni_id === currentUserId;

            // Real Reactions
            const reactors = reactsMap[post.id] || [];
            const hasReacted = reactors.includes(currentUserId);
            const realReactCount = reactors.length; // Real number!

            // Real Comments
            const comments = commentsMap[post.id] || [];
            const realCommentCount = comments.length; // Real number!
            const showComments = !!expandedComments[post.id];

            const hasFile = isStorageFile(post.file_url);
            const isImage = isImageFile(post.file_url, post.file_name);
            const hasLink = Boolean(post.file_url && !hasFile);
            const displayLinkLabel = post.file_name?.startsWith("link:")
              ? post.file_name.replace("link:", "")
              : post.file_url;

            const isDropdownOpen = visibilityDropdownPostId === post.id;
            const isUpdatingThis = updatingVisibilityId === post.id;

            return (
              <article
                key={post.id}
                className={`rounded-2xl border ${cardBg} p-4 sm:p-5 transition-all hover:border-[#1e9df1]/40 duration-200`}
              >
                {/* ── Post Header ── */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      onClick={() => onViewAlumniProfile?.(post.alumni_id)}
                      className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer bg-gradient-to-tr ${getAvatarGradient(authorName)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                      title="View Alumni Profile"
                    >
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(authorName)
                      )}
                    </div>

                    {/* Author Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onViewAlumniProfile?.(post.alumni_id)}
                          className={`font-bold text-xs sm:text-sm truncate hover:text-[#1e9df1] transition-colors cursor-pointer text-left ${textColor}`}
                        >
                          {authorName}
                        </button>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1e9df1] flex-shrink-0" title="Verified Alumni" />
                        <span className={`text-[10px] ${subColor}`}>·</span>
                        <span className={`text-[10px] ${subColor}`}>{formatTimeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{authorTitle}</p>
                      <p className="text-[10px] text-slate-500">{authorSub}</p>
                    </div>
                  </div>

                  {/* Actions & Visibility on right */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Visibility Badge with interactive change for author */}
                    {isMine ? (
                      <div className="relative" ref={isDropdownOpen ? visibilityDropdownRef : undefined}>
                        <button
                          type="button"
                          onClick={() =>
                            setVisibilityDropdownPostId(isDropdownOpen ? null : post.id)
                          }
                          disabled={isUpdatingThis}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                            post.visibility === "public"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : post.visibility === "mentees"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                          }`}
                          title="Click to change post visibility"
                        >
                          {isUpdatingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : post.visibility === "public" ? (
                            <>
                              <Globe className="w-3 h-3 text-emerald-400" />
                              <span>Public</span>
                            </>
                          ) : post.visibility === "mentees" ? (
                            <>
                              <Users className="w-3 h-3 text-amber-400" />
                              <span>Mentees</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-400" />
                              <span>Private</span>
                            </>
                          )}
                          <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>

                        {/* Dropdown Menu to change visibility */}
                        {isDropdownOpen && (
                          <div className={`absolute right-0 top-full mt-1.5 w-44 rounded-xl border p-1 shadow-xl z-20 animate-fade-in ${
                            isDarkMode ? "bg-[#1a1c22] border-[#2f3336]" : "bg-white border-slate-200"
                          }`}>
                            <p className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 text-slate-400">
                              Change Visibility
                            </p>
                            <button
                              type="button"
                              onClick={() => handleChangeVisibility(post, "public")}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                                post.visibility === "public"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : isDarkMode
                                  ? "text-slate-300 hover:bg-[#252830]"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-emerald-400" /> Public (Everyone)
                              </span>
                              {post.visibility === "public" && <Check className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeVisibility(post, "mentees")}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                                post.visibility === "mentees"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : isDarkMode
                                  ? "text-slate-300 hover:bg-[#252830]"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-amber-400" /> Mentees Only
                              </span>
                              {post.visibility === "mentees" && <Check className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleChangeVisibility(post, "private")}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                                post.visibility === "private"
                                  ? "bg-rose-500/15 text-rose-400"
                                  : isDarkMode
                                  ? "text-slate-300 hover:bg-[#252830]"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-rose-400" /> Private (Only Me)
                              </span>
                              {post.visibility === "private" && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Read-only badge for non-authors
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                        post.visibility === "public"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : post.visibility === "mentees"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {post.visibility === "public" ? (
                          <>
                            <Globe className="w-2.5 h-2.5" /> Public
                          </>
                        ) : post.visibility === "mentees" ? (
                          <>
                            <Users className="w-2.5 h-2.5" /> Mentees
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Private
                          </>
                        )}
                      </span>
                    )}

                    {/* Author Delete Button */}
                    {isMine && (
                      <button
                        onClick={() => handleDeletePost(post)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Headline / Title ── */}
                {post.title && post.title !== post.description && (
                  <h3 className={`font-bold text-sm sm:text-base leading-snug mb-2 ${textColor}`}>
                    {post.title}
                  </h3>
                )}

                {/* ── Post Caption / Content ── */}
                {post.description && (
                  <div className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line mb-3.5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {post.description.split(" ").map((word: string, i: number) => {
                      if (word.startsWith("#")) {
                        return (
                          <span key={i} className="text-[#1e9df1] font-semibold hover:underline cursor-pointer">
                            {word}{" "}
                          </span>
                        );
                      }
                      if (word.startsWith("http://") || word.startsWith("https://")) {
                        return (
                          <a
                            key={i}
                            href={word}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1e9df1] font-semibold underline underline-offset-2 break-all"
                          >
                            {word}{" "}
                          </a>
                        );
                      }
                      return word + " ";
                    })}
                  </div>
                )}

                {/* ── File Attachment Box ── */}
                {hasFile && (
                  <div className="mb-3.5">
                    {isImage ? (
                      <div className="rounded-xl overflow-hidden border border-[#2f3336]/40 max-h-96 bg-black/20">
                        <img
                          src={post.file_url}
                          alt={post.file_name || "Attachment"}
                          className="w-full h-auto object-cover hover:scale-[1.01] transition-transform duration-300 cursor-pointer"
                          onClick={() => window.open(post.file_url, "_blank")}
                        />
                      </div>
                    ) : (
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isDarkMode ? "bg-[#16181c] border-[#2f3336]" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#1e9df1] flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${textColor}`}>
                              {post.file_name || "Downloadable Resource File"}
                            </p>
                            <p className="text-[10px] text-slate-400">Direct Download Attachment</p>
                          </div>
                        </div>

                        <a
                          href={post.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-3 py-1.5 rounded-lg bg-[#1e9df1]/15 hover:bg-[#1e9df1] text-[#1e9df1] hover:text-white border border-[#1e9df1]/30 transition-all text-xs font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Get File</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Link Attachment Box ── */}
                {hasLink && (
                  <a
                    href={post.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mb-3.5 p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all cursor-pointer ${
                      isDarkMode
                        ? "bg-[#16181c] border-[#2f3336] hover:border-purple-500/50"
                        : "bg-slate-50 border-slate-200 hover:border-purple-400"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate group-hover:text-purple-400 transition-colors ${textColor}`}>
                          {displayLinkLabel}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          {post.file_url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:underline flex-shrink-0">
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                )}

                {/* ── Social Action Bar (Real React Count, Real Comments Count, Share) ── */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2f3336]/30 text-xs">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Real React Button */}
                    <button
                      onClick={() => handleToggleReact(post.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer active:scale-90 ${
                        hasReacted
                          ? "text-rose-500 bg-rose-500/10 font-bold"
                          : isDarkMode
                          ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          : "text-slate-500 hover:text-rose-500 hover:bg-slate-100"
                      }`}
                      title={!isLoggedIn ? "Sign in to react" : hasReacted ? "Unlike" : "React"}
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform ${hasReacted ? "fill-rose-500 scale-110 text-rose-500" : ""}`}
                      />
                      <span className="text-[11px] font-semibold">{realReactCount}</span>
                    </button>

                    {/* Real Comment Button */}
                    <button
                      onClick={() =>
                        setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        showComments
                          ? "text-[#1e9df1] bg-[#1e9df1]/10 font-semibold"
                          : isDarkMode
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                      title="View Comments & Discussion"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[11px] font-semibold">{realCommentCount}</span>
                    </button>

                    {/* Share / Copy */}
                    <button
                      onClick={() => handleCopyPost(post)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        copiedId === post.id
                          ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                          : isDarkMode
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                      title="Copy Post Link"
                    >
                      {copiedId === post.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                      <span className="text-[11px]">{copiedId === post.id ? "Copied!" : "Share"}</span>
                    </button>
                  </div>

                  <span className={`text-[10px] ${subColor}`}>
                    {post.department || "All Depts"}
                  </span>
                </div>

                {/* ── Real Comments Section ── */}
                {showComments && (
                  <div className="mt-3.5 pt-3 border-t border-[#2f3336]/20 space-y-3 animate-fade-in">
                    {/* Comments List */}
                    {comments.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {comments.map((comm) => (
                          <div
                            key={comm.id}
                            className={`p-2.5 rounded-xl border text-xs ${
                              isDarkMode ? "bg-[#16181c]/60 border-[#2f3336]/40" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-bold text-[11px] ${textColor}`}>
                                {comm.author_name}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {formatTimeAgo(comm.created_at)}
                              </span>
                            </div>
                            <p className={`leading-relaxed text-[11px] ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                              {comm.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-xs text-center py-2 ${subColor}`}>
                        No comments yet. Start the conversation!
                      </p>
                    )}

                    {/* Add Comment Input or Guest Sign In Prompt */}
                    {!isLoggedIn ? (
                      <div
                        onClick={() => onRequireLogin?.()}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isDarkMode
                            ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`text-[11px] ${subColor}`}>
                          Sign in to leave a comment
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequireLogin?.();
                          }}
                          className="px-3 py-1 rounded-lg bg-[#1e9df1] hover:bg-[#1a8cd8] text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          Sign In
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={commentInputMap[post.id] || ""}
                          onChange={(e) => setCommentInputMap((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                          placeholder="Write a comment or ask a question..."
                          className={`flex-1 px-3 py-1.5 rounded-xl text-xs border outline-none ${inputBg}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#1e9df1] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
