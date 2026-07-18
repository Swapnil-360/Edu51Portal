export interface Intake {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Section {
  id: string;
  intake_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Course {
  id: string;
  section_id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Material {
  id: string;
  course_code: string;
  course_name?: string;
  title: string;
  type: 'pdf' | 'doc' | 'video' | 'suggestion' | 'past_question';
  category: 'notes' | 'suggestions' | 'super-tips' | 'slides' | 'ct-questions' | 'videos' | 'other';
  file_url: string | null;
  video_url?: string;
  description?: string;
  exam_period?: 'midterm' | 'final'; // Added for exam period separation
  created_at: string;
  size?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'general' | 'exam' | 'emergency' | 'important_link' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  exam_type?: 'midterm' | 'final' | null;
  event_date?: string | null;
  is_active: boolean;
  created_at: string;
  // Routine attachment (image or PDF) — used for exam notices
  attachment_url?: string | null;
  attachment_type?: 'image' | 'pdf' | null;
  // Department this notice targets — null means all departments
  target_department?: string | null;
}

export type FeedbackCategory = 'bug' | 'improvement' | 'feature' | 'custom';
export type FeedbackStatus = 'new' | 'reviewed' | 'closed';

export interface Feedback {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  category: FeedbackCategory;
  subject: string | null;
  message: string;
  status: FeedbackStatus;
  page_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  type: 'course' | 'material';
  id: string;
  title: string;
  subtitle: string;
  path: string;
}