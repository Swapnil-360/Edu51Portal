export interface FacultyEducation {
  degree?: string;
  major?: string;
  institute?: string;
  year?: string;
}

export interface FacultyExperience {
  institute?: string;
  department?: string;
  position?: string;
  period?: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  code: string | null; // Teacher routine short code e.g. TAB, MAHB, SR, KNP
  departmentId: string; // e.g. cse, eee, civil, textile, math, law, english, management, etc.
  departmentName: string;
  facultyGroup: string; // e.g. Faculty of Computer Science & AI
  designations: string[];
  primaryDesignation: string;
  img: string | null;
  profileUrl: string | null;
  email: string | null;
  phone: string | null;
  bloodGroup?: string | null;
  room?: string | null;
  summary?: string | null;
  educations?: FacultyEducation[];
  experiences?: FacultyExperience[];
  publications?: string[];
}

export interface DepartmentOption {
  id: string;
  name: string;
  shortName: string;
  facultyGroup: string;
  color: string;
}

export interface ViceChancellor {
  name: string;
  title: string;
  university: string;
  academicRole: string;
  email: string;
  phone: string;
  office: string;
  avatar: string;
  message: string;
  bio: string;
  profileUrl: string;
}

export interface AdministrativeOffice {
  name: string;
  head: string;
  designation: string;
  email: string;
  phone: string;
  location: string;
  description: string;
}

export interface UniversityNotice {
  id: number | string;
  title: string;
  slug?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  file?: string | null;
  created_at: string;
  type?: string;
}
