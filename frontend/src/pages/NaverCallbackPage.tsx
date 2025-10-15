import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store';
import { Card, CardContent } from '@/components/UI';

const NaverCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setTokens } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('네이버 로그인을 처리하고 있습니다...');

  useEffect(() => {
    const handleNaverCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth 오류: ${errorDescription || error}`);
        }

        if (!code || !state) {
          throw new Error('인증 코드 또는 상태 파라미터가 누락되었습니다.');
        }

        // Verify state parameter for security
        const savedState = sessionStorage.getItem('oauth_state');
        if (state !== savedState) {
          throw new Error('잘못된 상태 파라미터입니다. 보안상 로그인을 중단합니다.');
        }

        // Clean up state from session storage
        sessionStorage.removeItem('oauth_state');

        setMessage('네이버 인증을 확인하고 있습니다...');

        // Send code and state to backend for verification
        const response = await authApi.naverLogin({ code, state });

        if (response.is_new_user) {
          // New user - redirect to onboarding with SNS profile data
          if (response.sns_profile) {
            sessionStorage.setItem('sns_profile', JSON.stringify(response.sns_profile));
            setStatus('success');
            setMessage('새로운 사용자입니다. 프로필 설정으로 이동합니다...');
            setTimeout(() => navigate('/onboarding'), 1500);
          } else {
            throw new Error('SNS 프로필 정보를 받을 수 없습니다.');
          }
        } else {
          // Existing user - save tokens and user data
          if (response.user && response.tokens) {
            setUser(response.user);
            setTokens(response.tokens);
            
            // Save to localStorage for persistence
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('access_token', response.tokens.access_token);
            localStorage.setItem('refresh_token', response.tokens.refresh_token);
            
            setStatus('success');
            setMessage('로그인 성공! 홈페이지로 이동합니다...');
            setTimeout(() => navigate('/'), 1500);
          } else {
            throw new Error('서버로부터 올바르지 않은 응답을 받았습니다.');
          }
        }
      } catch (error: any) {
        console.error('Naver login callback error:', error);
        setStatus('error');
        
        // User-friendly error messages
        let errorMessage = error.message;
        if (error.response?.status === 400) {
          errorMessage = '네이버 로그인 정보가 올바르지 않습니다.';
        } else if (error.response?.status === 500) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (!error.message) {
          errorMessage = '로그인 처리 중 오류가 발생했습니다.';
        }
        
        setMessage(errorMessage);
        
        // Redirect to login page after error with delay
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleNaverCallback();
  }, [searchParams, navigate, setUser, setTokens]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        );
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return '로그인 처리 중';
      case 'success':
        return '로그인 성공';
      case 'error':
        return '로그인 실패';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-gray-900';
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="text-center py-8">
            <div className="mb-4">
              {getStatusIcon()}
            </div>
            
            <h2 className={`text-lg font-semibold mb-2 ${getStatusColor()}`}>
              {getStatusTitle()}
            </h2>
            
            <p className="text-sm text-gray-600 mb-4">
              {message}
            </p>

            {status === 'error' && (
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  로그인 페이지로 돌아가기
                </button>
                <p className="text-xs text-gray-500">
                  문제가 지속되면 고객센터에 문의해주세요.
                </p>
              </div>
            )}

            {status === 'loading' && (
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  잠시만 기다려주세요...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NaverCallbackPage;