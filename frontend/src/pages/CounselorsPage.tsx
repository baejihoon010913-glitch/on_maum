import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/UI';
import { counselorsApi } from '@/api';
import { Counselor } from '@/types';

const CounselorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [filteredCounselors, setFilteredCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Load counselors on component mount
  useEffect(() => {
    loadCounselors();
  }, []);

  // Filter counselors when search query or specialty filter changes
  useEffect(() => {
    filterCounselors();
  }, [counselors, searchQuery, selectedSpecialty]);

  const loadCounselors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await counselorsApi.getCounselors({ is_available: true });
      setCounselors(data);
    } catch (err) {
      console.error('Error loading counselors:', err);
      setError('상담사 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterCounselors = () => {
    let filtered = [...counselors];

    // Filter by search query (name or introduction)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (counselor) =>
          counselor.staff.name.toLowerCase().includes(query) ||
          counselor.counselor_profile.introduction.toLowerCase().includes(query)
      );
    }

    // Filter by specialty
    if (selectedSpecialty) {
      filtered = filtered.filter((counselor) =>
        counselor.counselor_profile.specialties.includes(selectedSpecialty)
      );
    }

    setFilteredCounselors(filtered);
  };

  const handleCounselorClick = (counselor: Counselor) => {
    navigate(`/counselors/${counselor.staff.id}`);
  };

  const getAllSpecialties = () => {
    const specialtySet = new Set<string>();
    counselors.forEach((counselor) => {
      counselor.counselor_profile.specialties.forEach((specialty) => {
        specialtySet.add(specialty);
      });
    });
    return Array.from(specialtySet).sort();
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">
          ★
        </span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">
          ☆
        </span>
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">
          ☆
        </span>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-responsive-2xl font-bold text-gray-900">상담사</h1>
            <p className="text-responsive-sm text-gray-600 mt-2">
              전문 상담사들을 만나보고 상담을 예약하세요
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">상담사 목록을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h1 className="text-responsive-2xl font-bold text-gray-900">상담사</h1>
            <p className="text-responsive-sm text-gray-600 mt-2">
              전문 상담사들을 만나보고 상담을 예약하세요
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
              <Button onClick={loadCounselors} className="mt-4">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">상담사</h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            전문 상담사들을 만나보고 상담을 예약하세요
          </p>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="상담사 이름이나 소개를 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="md:w-64">
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">모든 전문분야</option>
                  {getAllSpecialties().map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              총 {filteredCounselors.length}명의 상담사가 있습니다.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Counselors Grid */}
      {filteredCounselors.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p className="text-responsive-base">검색 조건에 맞는 상담사가 없습니다.</p>
              <p className="text-sm mt-2">다른 검색어나 필터를 시도해보세요.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCounselors.map((counselor) => (
            <Card
              key={counselor.staff.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleCounselorClick(counselor)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    {counselor.counselor_profile.profile_image ? (
                      <img
                        src={counselor.counselor_profile.profile_image}
                        alt={counselor.staff.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-xl">👨‍⚕️</span>
                      </div>
                    )}
                  </div>

                  {/* Counselor Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {counselor.staff.name}
                    </h3>
                    
                    {/* Rating */}
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex">
                        {renderStars(counselor.counselor_profile.rating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatRating(counselor.counselor_profile.rating)} 
                        ({counselor.counselor_profile.total_sessions}회)
                      </span>
                    </div>

                    {/* Experience */}
                    <p className="text-sm text-gray-600 mt-1">
                      경력 {counselor.counselor_profile.experience_years}년
                    </p>

                    {/* Specialties */}
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {counselor.counselor_profile.specialties.slice(0, 3).map((specialty) => (
                          <span
                            key={specialty}
                            className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                        {counselor.counselor_profile.specialties.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{counselor.counselor_profile.specialties.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Introduction */}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {counselor.counselor_profile.introduction}
                    </p>

                    {/* Availability Status */}
                    <div className="mt-3">
                      {counselor.counselor_profile.is_available ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                          상담 가능
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                          상담 불가
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CounselorsPage;