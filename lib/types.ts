export interface Cohort {
  id: string;
  slug: string;
  type: string;
  apply_window: string;
  sprint_window: string;
  apply_by: string;
  qualifier_test_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  university: string;
  stack: string;
  github: string | null;
  availability: boolean;
  intent: string;
  email_verified: boolean;
  cohort_id: string | null;
  qualifier_email_sent_at: string | null;
  qualifier_email_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  error: string;
}
