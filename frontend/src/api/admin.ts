import apiClient from './client';

export interface SystemStats {
  total_users: number;
  active_users_today: number;
  total_posts: number;
  posts_today: number;
  total_sessions: number;
  sessions_today: number;
  pending_reports: number;
  system_health: string;
  last_updated: string;
}

export interface UserInfo {
  user_id: string;
  nickname: string;
  email: string;
  sns_provider: string;
  birth_year?: number;
  gender?: string;
  status: 'active' | 'suspended' | 'banned';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  activity_stats: {
    total_sessions: number;
    total_posts: number;
    total_diaries: number;
    empathy_given: number;
    empathy_received: number;
  };
  moderation_info: {
    report_count: number;
    suspension_count: number;
    ban_count: number;
    last_moderation?: string;
  };
}

export interface ContentInfo {
  content_id: string;
  type: 'post' | 'diary' | 'comment';
  title: string;
  content: string;
  author: {
    user_id: string;
    nickname: string;
  };
  category?: string;
  status: 'active' | 'reported' | 'hidden' | 'deleted';
  created_at: string;
  updated_at: string;
  moderation_info: {
    report_count: number;
    last_reported_at?: string;
    report_reasons: string[];
    moderation_status: string;
  };
  engagement: {
    view_count: number;
    empathy_count: number;
    comment_count: number;
  };
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuditLogEntry {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_role: string;
  action: string;
  action_description: string;
  severity: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  success: string;
  error_message?: string;
  created_at: string;
}

export interface PlatformStats {
  period: string;
  date_range: {
    start: string;
    end: string;
  };
  user_stats: {
    total_users: number;
    new_users: number;
    active_users: number;
    retention_rate: number;
  };
  content_stats: {
    total_posts: number;
    new_posts: number;
    public_posts: number;
    private_posts: number;
  };
  session_stats: {
    total_sessions: number;
    new_sessions: number;
    completed_sessions: number;
    cancelled_sessions: number;
  };
  system_stats: {
    total_staff: number;
    active_counselors: number;
    pending_reports: number;
  };
}

export interface StaffCreateRequest {
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'counselor' | 'moderator' | 'support';
  department?: string;
  password: string;
}

export interface StaffUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  is_active?: boolean;
}

export interface UserActionRequest {
  reason: string;
  notes?: string;
}

export interface ContentActionRequest {
  reason: string;
  notes?: string;
}

// Admin API
export const adminApi = {
  // System statistics
  getSystemStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get('/admin/system-stats');
    return response.data;
  },

  // Platform statistics
  getPlatformStats: async (period: 'week' | 'month' | 'year' = 'month'): Promise<PlatformStats> => {
    const response = await apiClient.get('/admin/platform-stats', {
      params: { period }
    });
    return response.data;
  },

  // User management
  getUsers: async (params: {
    skip?: number;
    limit?: number;
    status?: 'active' | 'suspended' | 'banned';
    search?: string;
  } = {}): Promise<UserInfo[]> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  suspendUser: async (userId: string, data: UserActionRequest): Promise<any> => {
    const response = await apiClient.post(`/admin/users/${userId}/suspend`, data);
    return response.data;
  },

  banUser: async (userId: string, data: UserActionRequest): Promise<any> => {
    const response = await apiClient.post(`/admin/users/${userId}/ban`, data);
    return response.data;
  },

  // Content management
  getContents: async (params: {
    skip?: number;
    limit?: number;
    type?: 'post' | 'diary' | 'comment';
    status?: 'active' | 'reported' | 'hidden' | 'deleted';
    search?: string;
  } = {}): Promise<ContentInfo[]> => {
    const response = await apiClient.get('/admin/contents', { params });
    return response.data;
  },

  hideContent: async (contentId: string, data: ContentActionRequest): Promise<any> => {
    const response = await apiClient.post(`/admin/contents/${contentId}/hide`, data);
    return response.data;
  },

  // Staff management
  getStaff: async (params: {
    skip?: number;
    limit?: number;
    role?: string;
    department?: string;
  } = {}): Promise<StaffMember[]> => {
    const response = await apiClient.get('/admin/staff', { params });
    return response.data;
  },

  createStaff: async (staffData: StaffCreateRequest): Promise<any> => {
    const response = await apiClient.post('/admin/staff', staffData);
    return response.data;
  },

  updateStaff: async (staffId: string, staffData: StaffUpdateRequest): Promise<any> => {
    const response = await apiClient.put(`/admin/staff/${staffId}`, staffData);
    return response.data;
  },

  updateStaffRole: async (staffId: string, role: string): Promise<any> => {
    const response = await apiClient.put(`/admin/staff/${staffId}/role`, { role });
    return response.data;
  },

  deactivateStaff: async (staffId: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/staff/${staffId}`);
    return response.data;
  },

  // Counselor applications
  getPendingApplications: async (): Promise<any[]> => {
    const response = await apiClient.get('/admin/pending-applications');
    return response.data;
  },

  approveApplication: async (applicationId: string, approvalData: any): Promise<any> => {
    const response = await apiClient.post(`/admin/applications/${applicationId}/approve`, approvalData);
    return response.data;
  },

  rejectApplication: async (applicationId: string, rejectionData: any): Promise<any> => {
    const response = await apiClient.post(`/admin/applications/${applicationId}/reject`, rejectionData);
    return response.data;
  },

  // Audit logs
  getAuditLogs: async (params: {
    skip?: number;
    limit?: number;
    staff_id?: string;
    action?: string;
    severity?: string;
    target_type?: string;
  } = {}): Promise<AuditLogEntry[]> => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },
};