import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { tokenManager } from '@/api/client';
import { authApi } from '@/api/auth';
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
  
  // Auth methods
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  
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

      // Auth methods
      login: (user: User, tokens: AuthTokens) => {
        const { setAuth } = get();
        setAuth(user, tokens);
      },

      logout: async () => {
        const { tokens, clearAuth } = get();
        
        try {
          if (tokens?.refresh_token) {
            await authApi.logout(tokens.refresh_token);
          }
        } catch (error) {
          console.error('Logout API error:', error);
          // Continue with local logout even if API call fails
        } finally {
          clearAuth();
        }
      },

      refreshUserData: async () => {
        const { setUser, clearAuth } = get();
        
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          // If user data fetch fails, clear auth
          clearAuth();
        }
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
      // Merge function to handle rehydration
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
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
    login: auth.login,
    logout: auth.logout,
    setUser: auth.setUser,
    setLoading: auth.setLoading,
    refreshUserData: auth.refreshUserData,
    getAccessToken: auth.getAccessToken,
    clearAuth: auth.clearAuth,
  };
};

// Initialize auth state from localStorage on app start
export const initializeAuth = async () => {
  const accessToken = tokenManager.getAccessToken();
  const refreshToken = tokenManager.getRefreshToken();
  
  if (accessToken && refreshToken) {
    // Set tokens in store
    useAuthStore.setState({
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 86400, // Default 24 hours
      },
      isAuthenticated: true,
    });

    // Try to fetch user data
    try {
      const userData = await authApi.getCurrentUser();
      useAuthStore.setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch user data on initialization:', error);
      // If user data fetch fails, clear everything
      useAuthStore.getState().clearAuth();
    }
  } else {
    // No tokens, ensure clean state
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
};