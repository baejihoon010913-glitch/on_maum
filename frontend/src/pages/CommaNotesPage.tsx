import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';

const CommaNotesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">
            쉼표노트
          </h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            나만의 비밀 다이어리에 오늘의 기분을 기록해보세요
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-responsive-base">쉼표노트 기능은 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 만나보실 수 있어요!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommaNotesPage;