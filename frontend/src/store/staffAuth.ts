/**
 * Staff Authentication Store
 * Separate authentication system for staff members (counselors, admins, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StaffInfo, StaffLoginResponse } from '../api/staff';

interface StaffAuthState {
  // Authentication state
  isAuthenticated: boolean;
  staff: StaffInfo | null;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  } | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStaff: (staff: StaffInfo) => void;
  setTokens: (tokens: StaffAuthState['tokens']) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (loginData: StaffLoginResponse) => void;
  logout: () => void;
  clearError: () => void;
  
  // Getters
  isAdmin: () => boolean;
  isCounselor: () => boolean;
  isModerator: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      staff: null,
      tokens: null,
      isLoading: false,
      error: null,

      // Actions
      setStaff: (staff) =>
        set((state) => ({
          ...state,
          staff,
          isAuthenticated: !!staff,
        })),

      setTokens: (tokens) =>
        set((state) => ({
          ...state,
          tokens,
        })),

      setError: (error) =>
        set((state) => ({
          ...state,
          error,
          isLoading: false,
        })),

      setLoading: (loading) =>
        set((state) => ({
          ...state,
          isLoading: loading,
        })),

      login: (loginData) =>
        set((state) => ({
          ...state,
          isAuthenticated: true,
          staff: loginData.staff,
          tokens: {
            accessToken: loginData.access_token,
            refreshToken: loginData.refresh_token,
            tokenType: loginData.token_type,
            expiresIn: loginData.expires_in,
          },
          error: null,
          isLoading: false,
        })),

      logout: () =>
        set(() => ({
          isAuthenticated: false,
          staff: null,
          tokens: null,
          isLoading: false,
          error: null,
        })),

      clearError: () =>
        set((state) => ({
          ...state,
          error: null,
        })),

      // Getters
      isAdmin: () => {
        const { staff } = get();
        return staff?.role === 'admin';
      },

      isCounselor: () => {
        const { staff } = get();
        return staff?.role === 'counselor';
      },

      isModerator: () => {
        const { staff } = get();
        return staff?.role === 'moderator';
      },

      hasRole: (role) => {
        const { staff } = get();
        return staff?.role === role;
      },
    }),
    {
      name: 'staff-auth-storage', // Separate from user auth storage
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        staff: state.staff,
        tokens: state.tokens,
      }),
    }
  )
);

// Initialize staff auth from localStorage on app start
export const initializeStaffAuth = () => {
  const stored = localStorage.getItem('staff-auth-storage');
  if (stored) {
    try {
      const parsedState = JSON.parse(stored);
      if (parsedState.state?.tokens?.accessToken) {
        // Validate token expiration
        const now = Date.now();
        const tokenExpiration = parsedState.state.tokens.expiresIn * 1000;
        
        if (now > tokenExpiration) {
          // Token expired, clear auth
          useStaffAuthStore.getState().logout();
        }
      }
    } catch (error) {
      console.error('Failed to initialize staff auth:', error);
      useStaffAuthStore.getState().logout();
    }
  }
};

// Utility function to get current staff access token
export const getStaffAccessToken = (): string | null => {
  const { tokens } = useStaffAuthStore.getState();
  return tokens?.accessToken || null;
};

// Utility function to check if staff is authenticated
export const isStaffAuthenticated = (): boolean => {
  const { isAuthenticated, tokens } = useStaffAuthStore.getState();
  
  if (!isAuthenticated || !tokens) {
    return false;
  }
  
  // Check token expiration
  const now = Date.now();
  const tokenExpiration = tokens.expiresIn * 1000;
  
  if (now > tokenExpiration) {
    useStaffAuthStore.getState().logout();
    return false;
  }
  
  return true;
};

// Utility function to get staff role
export const getStaffRole = (): string | null => {
  const { staff } = useStaffAuthStore.getState();
  return staff?.role || null;
};

export default useStaffAuthStore;