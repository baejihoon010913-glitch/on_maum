import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';

const CounselorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">
            상담사
          </h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            전문 상담사들을 만나보고 상담을 예약하세요
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-responsive-base">상담사 목록 기능은 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 만나보실 수 있어요!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounselorsPage;