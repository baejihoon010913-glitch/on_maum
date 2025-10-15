import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { MainLayout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { StaffProtectedRoute, StaffLayout } from '@/components/Staff';

// Pages
import {
  HomePage,
  LoginPage,
  NaverCallbackPage,
  OnboardingPage,
  EmpathyNotesPage,
  CommaNotesPage,
  ChatPage,
  DiaryPage,
  CounselorsPage,
  CounselorProfilePage,
  NotificationsPage,
  ProfilePage,
} from '@/pages';

// Staff Pages
import { StaffLoginPage, StaffDashboard } from '@/pages/Staff';
import { UserManagementPage } from '@/pages/Admin';

// Store
import { initializeAuth } from '@/store';
import { initializeStaffAuth } from '@/store/staffAuth';
import { ROUTES } from '@/utils/constants';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  // Initialize auth state from localStorage
  useEffect(() => {
    initializeAuth();
    initializeStaffAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes (no authentication required) */}
          <Route 
            path={ROUTES.LOGIN} 
            element={
              <ProtectedRoute requireAuth={false}>
                <LoginPage />
              </ProtectedRoute>
            } 
          />
          
          {/* OAuth Callback Route */}
          <Route 
            path="/auth/naver/callback" 
            element={
              <ProtectedRoute requireAuth={false}>
                <NaverCallbackPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path={ROUTES.ONBOARDING} 
            element={
              <ProtectedRoute requireAuth={false}>
                <OnboardingPage />
              </ProtectedRoute>
            } 
          />

          {/* Staff Login (Public) */}
          <Route 
            path="/staff/login" 
            element={
              <StaffProtectedRoute requireAuth={false}>
                <StaffLoginPage />
              </StaffProtectedRoute>
            } 
          />

          {/* Protected routes (authentication required) */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path={ROUTES.EMPATHY_NOTES} element={<EmpathyNotesPage />} />
            <Route path={ROUTES.COMMA_NOTES} element={<CommaNotesPage />} />
            <Route path={ROUTES.CHAT} element={<ChatPage />} />
            <Route path={ROUTES.DIARY} element={<DiaryPage />} />
            <Route path={ROUTES.COUNSELORS} element={<CounselorsPage />} />
            <Route path="counselors/:counselorId" element={<CounselorProfilePage />} />
            <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          </Route>

          {/* Staff Portal Routes (Protected) */}
          <Route 
            path="/staff" 
            element={
              <StaffProtectedRoute>
                <StaffLayout />
              </StaffProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StaffDashboard />} />
          </Route>

          {/* Admin Portal Routes (Admin Only) */}
          <Route 
            path="/admin" 
            element={
              <StaffProtectedRoute requiredRole="admin">
                <StaffLayout />
              </StaffProtectedRoute>
            }
          >
            <Route path="users" element={<UserManagementPage />} />
          </Route>

          {/* 404 - Catch all route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">페이지를 찾을 수 없습니다.</p>
                  <a 
                    href={ROUTES.HOME} 
                    className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    홈으로 돌아가기
                  </a>
                </div>
              </div>
            } 
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;