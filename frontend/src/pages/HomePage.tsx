import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';

const HomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">
            OnMaum에 오신 것을 환영합니다
          </h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            청소년을 위한 안전하고 익명성이 보장되는 상담 플랫폼입니다.
          </p>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 text-2xl">💝</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">공감노트</h3>
              <p className="text-sm text-gray-600">
                다른 사람들과 마음을 나누고 공감을 받아보세요
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-secondary-100 rounded-full flex items-center justify-center">
                <span className="text-secondary-600 text-2xl">📝</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">쉼표노트</h3>
              <p className="text-sm text-gray-600">
                나만의 비밀 다이어리에 오늘의 기분을 기록해보세요
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">전문 상담</h3>
              <p className="text-sm text-gray-600">
                전문 상담사와 1:1로 대화하며 도움을 받아보세요
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className="text-responsive-lg font-semibold text-gray-900">
            최근 활동
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-responsive-sm">아직 활동이 없습니다.</p>
            <p className="text-xs mt-1">첫 번째 글을 작성하거나 상담을 신청해보세요!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;