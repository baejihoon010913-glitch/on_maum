import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StaffInfo, StaffLoginResponse } from '@/api/staff';

interface StaffTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface StaffAuthState {
  staff: StaffInfo | null;
  tokens: StaffTokens | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (response: StaffLoginResponse) => void;
  logout: () => void;
  updateStaff: (staff: StaffInfo) => void;
  getAccessToken: () => string | null;
  clearAuth: () => void;
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set, get) => ({
      staff: null,
      tokens: null,
      isAuthenticated: false,

      login: (response: StaffLoginResponse) => {
        const { staff, ...tokens } = response;
        set({
          staff,
          tokens,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          staff: null,
          tokens: null,
          isAuthenticated: false,
        });
      },

      updateStaff: (staff: StaffInfo) => {
        set({ staff });
      },

      getAccessToken: () => {
        const { tokens } = get();
        return tokens?.access_token || null;
      },

      clearAuth: () => {
        set({
          staff: null,
          tokens: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'staff-auth-storage',
      partialize: (state) => ({
        staff: state.staff,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize authentication state from localStorage
export const initializeStaffAuth = () => {
  const state = useStaffAuthStore.getState();
  
  // Check if tokens are expired (simple check)
  if (state.tokens) {
    const tokenExpiry = Date.now() + (state.tokens.expires_in * 1000);
    if (Date.now() > tokenExpiry) {
      state.clearAuth();
    }
  }
};