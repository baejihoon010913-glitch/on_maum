import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { GENDER_OPTIONS, BIRTH_YEAR_RANGE } from '@/utils/constants';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  
  const [snsProfile, setSnsProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    nickname: '',
    birthYear: '',
    gender: '',
  });
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load SNS profile data on component mount
  useEffect(() => {
    const savedProfile = sessionStorage.getItem('sns_profile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setSnsProfile(profile);
        
        // Pre-fill nickname with SNS name if available
        if (profile.name) {
          setFormData(prev => ({
            ...prev,
            nickname: profile.name
          }));
        }
      } catch (error) {
        console.error('Error parsing SNS profile:', error);
        setError('SNS 프로필 정보를 불러오는데 실패했습니다.');
        // Redirect to login if no valid profile data
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setError('SNS 로그인 정보가 없습니다. 다시 로그인해주세요.');
      // Redirect to login if no profile data
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset nickname availability when nickname changes
    if (name === 'nickname') {
      setNicknameAvailable(null);
    }
  };

  const checkNickname = async () => {
    if (!formData.nickname || formData.nickname.length < 2) {
      setError('닉네임은 2자 이상 입력해주세요.');
      return;
    }
    
    setNicknameChecking(true);
    setError(null);
    
    try {
      const result = await authApi.checkNickname(formData.nickname);
      setNicknameAvailable(result.available);
      
      if (!result.available) {
        setError(result.message || '이미 사용중인 닉네임입니다.');
      }
    } catch (error: any) {
      console.error('Nickname check failed:', error);
      setError('닉네임 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setNicknameAvailable(false);
    } finally {
      setNicknameChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!snsProfile) {
      setError('SNS 로그인 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    if (nicknameAvailable !== true) {
      setError('닉네임 중복확인을 완료해주세요.');
      return;
    }

    if (!formData.nickname || !formData.birthYear || !formData.gender) {
      setError('모든 필수 정보를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const onboardingData = {
        sns_provider: snsProfile.provider,
        sns_id: snsProfile.sns_id,
        email: snsProfile.email,
        nickname: formData.nickname.trim(),
        birth_year: parseInt(formData.birthYear),
        gender: formData.gender,
      };

      console.log('Submitting onboarding data:', onboardingData);

      const response = await authApi.completeOnboarding(onboardingData);
      
      // Save user data and tokens to store and localStorage
      setUser(response.user);
      setTokens(response.tokens);
      
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('access_token', response.tokens.access_token);
      localStorage.setItem('refresh_token', response.tokens.refresh_token);
      
      // Clean up session storage
      sessionStorage.removeItem('sns_profile');
      
      console.log('Onboarding completed successfully:', response);
      
      // Redirect to home page
      navigate('/', { replace: true });
      
    } catch (error: any) {
      console.error('Onboarding failed:', error);
      
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || '입력된 정보가 올바르지 않습니다.';
      } else if (error.response?.status === 409) {
        errorMessage = '이미 가입된 사용자입니다.';
      } else if (error.response?.status === 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const birthYears = Array.from(
    { length: BIRTH_YEAR_RANGE.MAX - BIRTH_YEAR_RANGE.MIN + 1 },
    (_, i) => BIRTH_YEAR_RANGE.MAX - i
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <div className="text-center">
              <h1 className="text-responsive-2xl font-bold text-gray-900">
                회원가입
              </h1>
              <p className="text-responsive-sm text-gray-600 mt-2">
                OnMaum에서 사용할 기본 정보를 입력해주세요
              </p>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="text-red-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SNS Profile Info */}
              {snsProfile && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <div className="text-green-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        네이버 계정({snsProfile.email})으로 로그인되었습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nickname */}
              <div>
                <Input
                  label="닉네임"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="사용하실 닉네임을 입력해주세요"
                  helperText="2-10자 이내로 입력해주세요"
                />
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={checkNickname}
                    isLoading={nicknameChecking}
                    disabled={!formData.nickname || formData.nickname.length < 2}
                  >
                    중복확인
                  </Button>
                  {nicknameAvailable === true && (
                    <span className="ml-2 text-sm text-green-600">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      사용 가능한 닉네임입니다
                    </span>
                  )}
                  {nicknameAvailable === false && (
                    <span className="ml-2 text-sm text-red-600">
                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      사용할 수 없는 닉네임입니다
                    </span>
                  )}
                </div>
              </div>

              {/* Birth Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  출생년도
                </label>
                <select
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">출생년도를 선택해주세요</option>
                  {birthYears.map(year => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성별
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">성별을 선택해주세요</option>
                  {GENDER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!formData.nickname || !formData.birthYear || !formData.gender || nicknameAvailable !== true || submitting}
                isLoading={submitting}
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    가입 처리 중...
                  </div>
                ) : (
                  '가입 완료'
                )}
              </Button>

              <div className="text-center text-xs text-gray-500">
                <p>
                  회원가입 시 OnMaum의 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;