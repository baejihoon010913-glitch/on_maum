import React, { useState } from 'react';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { GENDER_OPTIONS, BIRTH_YEAR_RANGE } from '@/utils/constants';

const OnboardingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    nickname: '',
    birthYear: '',
    gender: '',
  });
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);

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
    if (!formData.nickname || formData.nickname.length < 2) return;
    
    setNicknameChecking(true);
    // TODO: Implement actual nickname check API call
    setTimeout(() => {
      setNicknameAvailable(true);
      setNicknameChecking(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement onboarding submission
    console.log('Onboarding data:', formData);
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
                    <span className="ml-2 text-sm text-green-600">사용 가능한 닉네임입니다</span>
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
                disabled={!formData.nickname || !formData.birthYear || !formData.gender || nicknameAvailable !== true}
              >
                가입 완료
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