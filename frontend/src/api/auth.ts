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
    const response = await apiClient.get(`/auth/check-nickname/${nickname}`);
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
  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // Delete account
  deleteAccount: async (confirmationData: {
    confirmation_text: string;
    reason?: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.delete('/auth/me', {
      data: confirmationData,
    });
    return response.data;
  },
};