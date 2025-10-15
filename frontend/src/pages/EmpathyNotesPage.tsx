import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';

const EmpathyNotesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">
            공감노트
          </h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            다른 친구들과 마음을 나누고 공감을 받아보세요
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-responsive-base">공감노트 기능은 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 만나보실 수 있어요!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpathyNotesPage;