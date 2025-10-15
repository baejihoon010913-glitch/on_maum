import apiClient from './client';
import { LoginResponse, AuthTokens, User } from '@/types';

export interface SNSLoginRequest {
  code: string;
  state: string;
}

export interface OnboardingRequest {
  sns_provider: string;
  sns_id: string;
  email: string;
  nickname: string;
  birth_year: number;
  gender: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AccountDeletionRequest {
  confirmation_text: string;
  reason?: string;
}

export interface UserConsentCreate {
  consent_type: string;
  consent_granted: boolean;
  consent_details?: {
    allow_past_sessions?: boolean;
    allow_public_posts?: boolean;
    allow_mood_trends?: boolean;
    data_retention_days?: number;
  };
}

export interface UserConsentResponse {
  consent_id: string;
  consent_type: string;
  consent_granted: boolean;
  consent_details?: Record<string, any>;
  granted_at: string;
  expires_at?: string;
  can_revoke: boolean;
}

export interface UserConsentsResponse {
  consents: Array<{
    consent_id: string;
    consent_type: string;
    consent_granted: boolean;
    granted_at: string;
    expires_at?: string;
    last_accessed?: string;
    access_count: number;
  }>;
  privacy_info: {
    data_anonymization: string;
    data_retention: string;
    access_control: string;
  };
}

// Authentication API calls
export const authApi = {
  // Naver OAuth login
  naverLogin: async (data: SNSLoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/sns-login/naver', data);
    return response.data;
  },

  // Complete onboarding for new users
  completeOnboarding: async (data: OnboardingRequest): Promise<{
    user: User;
    tokens: AuthTokens;
  }> => {
    const response = await apiClient.post('/auth/complete-onboarding', data);
    return response.data;
  },

  // Check nickname availability
  checkNickname: async (nickname: string): Promise<{
    available: boolean;
    message: string;
  }> => {
    const response = await apiClient.get(`/auth/check-nickname/${encodeURIComponent(nickname)}`);
    return response.data;
  },

  // Get current user info
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Logout
  logout: async (refreshToken: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/logout', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Delete account
  deleteAccount: async (confirmationData: AccountDeletionRequest): Promise<{
    message: string;
    deleted_at: string;
    data_retention_info: {
      anonymized_data: string;
      deletion_period: string;
    };
  }> => {
    const response = await apiClient.delete('/auth/me', {
      data: confirmationData,
    });
    return response.data;
  },

  // Create/update user consent
  createUserConsent: async (data: UserConsentCreate): Promise<UserConsentResponse> => {
    const response = await apiClient.post('/auth/me/consent', data);
    return response.data;
  },

  // Get user consents
  getUserConsents: async (): Promise<UserConsentsResponse> => {
    const response = await apiClient.get('/auth/me/consent');
    return response.data;
  },
};