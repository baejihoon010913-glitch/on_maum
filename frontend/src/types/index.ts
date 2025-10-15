// User types
export interface User {
  id: string;
  email: string;
  nickname: string;
  profile_image?: string;
  birth_year?: number;
  gender?: 'male' | 'female' | 'other';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Authentication types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  is_new_user: boolean;
  user?: User;
  tokens?: AuthTokens;
  sns_profile?: {
    provider: string;
    sns_id: string;
    email: string;
    name: string;
    profile_image?: string;
  };
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category?: string;
  is_private: boolean;
  view_count: number;
  empathy_count: number;
  is_empathized: boolean;
  emoji_reactions: Array<{
    emoji: string;
    count: number;
  }>;
  created_at: string;
  updated_at?: string;
  author: {
    nickname: string;
    profile_image?: string;
  };
}

export interface PostCreate {
  title: string;
  content: string;
  category?: string;
  is_private: boolean;
}

// Diary types
export interface Diary {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string;
  created_at: string;
  updated_at?: string;
}

export interface DiaryCreate {
  title: string;
  content: string;
  mood?: string;
}

// Chat Session types
export interface ChatSession {
  id: string;
  user_id: string;
  counselor_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  duration?: number;
  category?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Message types
export interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: 'user' | 'counselor';
  content: string;
  created_at: string;
  updated_at?: string;
}

// Counselor types
export interface Counselor {
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    is_active: boolean;
  };
  counselor_profile: {
    id: string;
    staff_id: string;
    specialties: string[];
    license_number: string;
    experience_years: number;
    education: string;
    introduction: string;
    profile_image?: string;
    rating: number;
    total_sessions: number;
    is_available: boolean;
    working_hours?: string;
  };
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

// API Error types
export interface ApiError {
  detail: string;
  status_code?: number;
}

// Common API response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}