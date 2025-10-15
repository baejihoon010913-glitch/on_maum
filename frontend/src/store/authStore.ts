import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { tokenManager } from '@/api/client';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  
  // Computed
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setTokens: (tokens: AuthTokens) => {
        // Store tokens in localStorage via tokenManager
        tokenManager.setTokens(tokens);
        set({ tokens, isAuthenticated: true });
      },

      setAuth: (user: User, tokens: AuthTokens) => {
        // Store tokens in localStorage via tokenManager
        tokenManager.setTokens(tokens);
        set({ 
          user, 
          tokens, 
          isAuthenticated: true,
          isLoading: false 
        });
      },

      clearAuth: () => {
        // Clear tokens from localStorage
        tokenManager.clearTokens();
        set({ 
          user: null, 
          tokens: null, 
          isAuthenticated: false,
          isLoading: false 
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Computed getters
      getAccessToken: () => {
        const state = get();
        return state.tokens?.access_token || tokenManager.getAccessToken();
      },

      getRefreshToken: () => {
        const state = get();
        return state.tokens?.refresh_token || tokenManager.getRefreshToken();
      },
    }),
    {
      name: STORAGE_KEYS.USER_DATA,
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not tokens (tokens are managed by tokenManager)
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Auth store helper hooks
export const useAuth = () => {
  const auth = useAuthStore();
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: auth.setAuth,
    logout: auth.clearAuth,
    setUser: auth.setUser,
    setLoading: auth.setLoading,
    getAccessToken: auth.getAccessToken,
  };
};

// Initialize auth state from localStorage on app start
export const initializeAuth = () => {
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  
  if (accessToken && refreshToken) {
    useAuthStore.setState({
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 86400, // Default 24 hours
      },
      isAuthenticated: true,
    });
  }
};