import React from 'react';
import { Card, CardContent, CardHeader, Button } from '@/components/UI';

const LoginPage: React.FC = () => {
  const handleNaverLogin = () => {
    // Generate random state for security
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    // Naver OAuth configuration
    const naverClientId = import.meta.env.VITE_NAVER_CLIENT_ID || 'your_naver_client_id';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/naver/callback');
    const responseType = 'code';
    
    // Build Naver OAuth URL
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=${responseType}&client_id=${naverClientId}&redirect_uri=${redirectUri}&state=${state}`;
    
    console.log('Redirecting to Naver OAuth:', naverAuthUrl);
    
    // Redirect to Naver OAuth
    window.location.href = naverAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">O</span>
              </div>
              <h1 className="text-responsive-2xl font-bold text-gray-900">
                OnMaum
              </h1>
              <p className="text-responsive-sm text-gray-600 mt-2">
                청소년을 위한 익명 상담 플랫폼
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-responsive-lg font-semibold text-gray-900 mb-2">
                  로그인
                </h2>
                <p className="text-responsive-sm text-gray-600">
                  네이버 계정으로 간편하게 로그인하세요
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                  onClick={handleNaverLogin}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="font-medium">네이버로 로그인</span>
                  </div>
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 space-y-2">
                <p>
                  로그인 시 OnMaum의{' '}
                  <a href="#" className="text-primary-600 hover:underline">
                    이용약관
                  </a>
                  {' '}및{' '}
                  <a href="#" className="text-primary-600 hover:underline">
                    개인정보처리방침
                  </a>
                  에 동의하게 됩니다.
                </p>
                <p>
                  OnMaum은 안전하고 익명성이 보장되는 청소년 전용 상담 서비스입니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;