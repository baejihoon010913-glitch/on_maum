import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { MainLayout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import {
  HomePage,
  LoginPage,
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

// Store
import { initializeAuth } from '@/store';
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
          
          <Route 
            path={ROUTES.ONBOARDING} 
            element={
              <ProtectedRoute requireAuth={false}>
                <OnboardingPage />
              </ProtectedRoute>
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