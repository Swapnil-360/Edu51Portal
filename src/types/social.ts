// Domain types for the V2 social platform features
// (profiles, connections, teams — Phase 1)

export type ProfileVisibility = "public" | "users" | "private";

export interface SocialProfile {
  id: string;
  username: string | null;
  name: string;
  headline: string | null;
  about: string | null;
  location: string | null;
  website: string | null;
  social_links: Record<string, string>;
  avatar_url: string | null;
  cover_photo_url: string | null;
  skills: string[];
  interests: string[];
  visibility: ProfileVisibility;
  is_alumni: boolean;
  is_admin: boolean;
  // legacy Edu51Five fields (kept working)
  section: string | null;
  major: string | null;
  bubt_email: string | null;
  phone: string | null;
  profile_pic: string | null; // legacy base64 — fallback when avatar_url is null
  wc26_team: string | null;  // WC2026 supported team code e.g. "ARG"
  created_at: string;
}

export interface Education {
  id: string;
  user_id: string;
  institution: string;
  department: string | null;
  degree: string | null;
  session: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  sort_order: number;
  created_at: string;
}

export interface Experience {
  id: string;
  user_id: string;
  title: string;
  company: string;
  employment_type: EmploymentType | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  created_at: string;
}

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "internship"
  | "freelance"
  | "contract"
  | "volunteer";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  freelance: "Freelance",
  contract: "Contract",
  volunteer: "Volunteer",
};

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
  // joined profile of the "other" user (populated client-side)
  other_profile?: SocialProfile;
}

export type TeamCategory =
  | "startup"
  | "research"
  | "hackathon"
  | "academic_project"
  | "open_source"
  | "freelancing"
  | "competition";

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  startup: "Startup",
  research: "Research",
  hackathon: "Hackathon",
  academic_project: "Academic Project",
  open_source: "Open Source",
  freelancing: "Freelancing",
  competition: "Competition",
};

export type TeamRole = "owner" | "admin" | "member";

export interface Team {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  category: TeamCategory;
  required_skills: string[];
  max_members: number;
  logo_url: string | null;
  banner_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count?: number; // populated client-side
  my_role?: TeamRole | null;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  profile?: SocialProfile;
}

export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface TeamInvitation {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  message: string | null;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
  team?: Team;
  inviter_profile?: SocialProfile;
  invitee_profile?: SocialProfile;
}

export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
  responded_at: string | null;
  team?: Team;
  user_profile?: SocialProfile;
}

export interface TeamAnnouncement {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  body: string | null;
  created_at: string;
  author_profile?: SocialProfile;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  sender?: SocialProfile;
  reply_to?: { id: string; content: string; sender_name: string } | null;
  reactions?: { emoji: string; user_ids: string[] }[];
}

export type TaskPriority = "low" | "medium" | "high";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export interface TeamTask {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: SocialProfile | null;
  creator_profile?: SocialProfile | null;
}

export interface TeamFile {
  id: string;
  team_id: string;
  uploader_id: string;
  name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  visibility: 'private' | 'public';
  created_at: string;
  team?: { id: string; name: string; logo_url?: string | null };
  uploader?: SocialProfile;
}


export interface AlumniProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  graduation_year: number;
  major: string;
  job_title: string | null;
  company_name: string | null;
  city: string | null;
  linkedin_url: string | null;
  bio: string | null;
  career_tips: string | null;
  is_verified: boolean;
  is_available_for_mentorship: boolean;
  created_at: string;
  updated_at: string;
}

// Columns selected for profile lists/cards (never select legacy base64 profile_pic in lists)
export const SOCIAL_PROFILE_COLS =
  "id,username,name,headline,about,location,website,social_links,avatar_url,cover_photo_url,skills,interests,visibility,is_alumni,is_admin,section,major,bubt_email,phone,wc26_team,created_at";

// Lighter selection for cards/search results
export const PROFILE_CARD_COLS =
  "id,username,name,headline,avatar_url,skills,section,major,is_alumni,wc26_team";
