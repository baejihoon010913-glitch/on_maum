import apiClient from './client';

export interface StaffRole {
  ADMIN: 'admin';
  COUNSELOR: 'counselor';
  MODERATOR: 'moderator';
  SUPPORT: 'support';
}

export interface StaffInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: keyof StaffRole;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface StaffLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  staff: StaffInfo;
}

export interface StaffDashboardStats {
  today_stats: {
    total_sessions: number;
    completed_sessions: number;
    pending_sessions: number;
    cancelled_sessions: number;
    total_messages: number;
    new_posts: number;
  };
  active_chat_sessions: Array<{
    session_id: string;
    user_nickname: string;
    category: string;
    started_at: string;
    last_message_at?: string;
    unread_messages: number;
  }>;
  pending_posts: Array<{
    post_id: string;
    title: string;
    category: string;
    created_at: string;
    urgency: 'low' | 'medium' | 'high';
    view_count: number;
  }>;
  notifications: string[];
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface CounselorProfileCreate {
  specialties: string[];
  license_number: string;
  experience_years: number;
  education: string;
  introduction: string;
  working_hours?: string;
}

export interface SessionActionRequest {
  action: 'accept' | 'reject';
  reason?: string;
}

export interface CounselorReplyRequest {
  post_id: string;
  content: string;
}

// Staff Authentication API
export const staffAuthApi = {
  // Staff login
  login: async (credentials: StaffLoginRequest): Promise<StaffLoginResponse> => {
    const response = await apiClient.post('/staff/login', credentials);
    return response.data;
  },

  // Get current staff info
  getCurrentStaff: async (): Promise<StaffInfo> => {
    const response = await apiClient.get('/staff/me');
    return response.data;
  },

  // Staff logout
  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/staff/logout');
    return response.data;
  },

  // Change password
  changePassword: async (data: PasswordChangeRequest): Promise<{ message: string }> => {
    const response = await apiClient.post('/staff/change-password', data);
    return response.data;
  },
};

// Counselor API
export const counselorApi = {
  // Create counselor profile
  createProfile: async (profileData: CounselorProfileCreate): Promise<any> => {
    const response = await apiClient.post('/staff/counselor/profile', profileData);
    return response.data;
  },

  // Get counselor dashboard
  getDashboard: async (): Promise<StaffDashboardStats> => {
    const response = await apiClient.get('/staff/counselor/dashboard');
    return response.data;
  },

  // Handle session action
  handleSessionAction: async (sessionId: string, actionData: SessionActionRequest): Promise<any> => {
    const response = await apiClient.post(`/staff/counselor/sessions/${sessionId}/action`, actionData);
    return response.data;
  },

  // Create counselor reply
  createReply: async (replyData: CounselorReplyRequest): Promise<any> => {
    const response = await apiClient.post('/staff/counselor/replies', replyData);
    return response.data;
  },

  // Get user history for session
  getUserHistory: async (sessionId: string): Promise<any> => {
    const response = await apiClient.get(`/staff/counselor/sessions/${sessionId}/user-history`);
    return response.data;
  },
};