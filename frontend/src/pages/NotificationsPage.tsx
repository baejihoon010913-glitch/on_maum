import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';

const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-responsive-2xl font-bold text-gray-900">
            알림
          </h1>
          <p className="text-responsive-sm text-gray-600 mt-2">
            새로운 알림을 확인하세요
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-responsive-base">아직 새로운 알림이 없습니다.</p>
            <p className="text-sm mt-2">활동하시면 알림이 여기에 표시됩니다!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;