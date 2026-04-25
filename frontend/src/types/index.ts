// User
export type UserRole = "student" | "admin" | "reviewer";

export interface User {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// Profession
export interface ProfessionImage {
  id: number;
  file_path: string;
  order: number;
}

export interface Profession {
  id: number;
  title: string;
  short_description?: string;
  description?: string;
  what_does?: string;
  skills?: string;
  where_works?: string;
  video_url?: string;
  video_file?: string;
  is_published: number;
  images: ProfessionImage[];
  created_at: string;
}

export interface ProfessionListItem {
  id: number;
  title: string;
  short_description?: string;
  images: ProfessionImage[];
  is_published: number;
}

// Test
export type QuestionType = "single" | "multiple" | "open";

export interface QuestionOption {
  id: number;
  text: string;
  order: number;
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  points: number;
  order: number;
  options: QuestionOption[];
}

export interface Test {
  id: number;
  title: string;
  description?: string;
  max_attempts: number;
  is_published: boolean;
  profession_id?: number;
  questions: Question[];
  created_at: string;
}

export interface TestListItem {
  id: number;
  title: string;
  description?: string;
  max_attempts: number;
  profession_id?: number;
  question_count: number;
}

export interface TestAttempt {
  id: number;
  test_id: number;
  score: number;
  max_score: number;
  is_completed: boolean;
  started_at: string;
  completed_at?: string;
  answers: TestAnswer[];
}

export interface TestAttemptListItem {
  id: number;
  test_id: number;
  test_title: string;
  score: number;
  max_score: number;
  is_completed: boolean;
  started_at: string;
}

export interface TestAnswer {
  question_id: number;
  selected_options: number[];
  open_answer?: string;
  is_correct?: boolean;
  points_earned: number;
}

// Assignment
export type AssignmentType = "text" | "file" | "analytical";

export interface AssignmentFile {
  id: number;
  file_path: string;
  original_name?: string;
}

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  type: AssignmentType;
  max_score: number;
  is_published: boolean;
  profession_id?: number;
  files: AssignmentFile[];
  created_at: string;
}

export interface AssignmentListItem {
  id: number;
  title: string;
  type: AssignmentType;
  max_score: number;
  profession_id?: number;
  is_published: boolean;
}

// Submission
export type SubmissionStatus = "submitted" | "reviewing" | "accepted" | "revision" | "rejected";

export interface Submission {
  id: number;
  student_id: number;
  assignment_id: number;
  text_answer?: string;
  file_path?: string;
  original_file_name?: string;
  status: SubmissionStatus;
  score?: number;
  comment?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface SubmissionAdmin extends Submission {
  student_name?: string;
  student_phone?: string;
  assignment_title?: string;
  assignment_max_score?: number;
}

// Admin dashboard
export interface DashboardStats {
  total_students: number;
  total_professions: number;
  total_tests: number;
  total_assignments: number;
  total_submissions: number;
  pending_submissions: number;
  test_attempts_today: number;
}
