import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Button } from '@/components/UI';
import { useStaffAuthStore } from '@/store/staffAuth';
import { counselorApi } from '@/api/staff';
import { adminApi } from '@/api/admin';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  counselor?: any;
  admin?: any;
  loading: boolean;
  error: string | null;
}

const StaffDashboard: React.FC = () => {
  const { staff, isCounselor, isAdmin } = useStaffAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, [staff]);

  const loadDashboardData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      if (isCounselor()) {
        const counselorData = await counselorApi.getDashboard();
        setStats(prev => ({ ...prev, counselor: counselorData }));
      }

      if (isAdmin()) {
        const [systemStats, platformStats] = await Promise.all([
          adminApi.getSystemStats(),
          adminApi.getPlatformStats('month'),
        ]);
        setStats(prev => ({ 
          ...prev, 
          admin: { systemStats, platformStats } 
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(prev => ({ 
        ...prev, 
        error: 'Failed to load dashboard data' 
      }));
    } finally {
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-red-600">{stats.error}</p>
            <Button onClick={loadDashboardData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard - {staff?.name}
        </h1>
        <Button onClick={loadDashboardData} variant="ghost">
          🔄 Refresh
        </Button>
      </div>

      {/* Counselor Dashboard */}
      {isCounselor() && stats.counselor && (
        <CounselorDashboard data={stats.counselor} />
      )}

      {/* Admin Dashboard */}
      {isAdmin() && stats.admin && (
        <AdminDashboard data={stats.admin} />
      )}

      {/* General Staff Dashboard */}
      {!isCounselor() && !isAdmin() && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👋</div>
          <h2 className="text-xl font-semibold text-gray-900">Welcome to OnMaum Staff Portal</h2>
          <p className="text-gray-600 mt-2">
            Your dashboard will be customized based on your role and permissions.
          </p>
        </div>
      )}
    </div>
  );
};

const CounselorDashboard: React.FC<{ data: any }> = ({ data }) => {
  const sessionStatusData = {
    labels: ['Completed', 'Pending', 'Cancelled'],
    datasets: [
      {
        data: [
          data.today_stats.completed_sessions,
          data.today_stats.pending_sessions,
          data.today_stats.cancelled_sessions,
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const activityData = {
    labels: ['Sessions', 'Messages', 'New Posts'],
    datasets: [
      {
        label: 'Today\'s Activity',
        data: [
          data.today_stats.total_sessions,
          data.today_stats.total_messages,
          data.today_stats.new_posts,
        ],
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      },
    ],
  };

  return (
    <>
      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{data.today_stats.total_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{data.today_stats.completed_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{data.today_stats.pending_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">New Posts</p>
                <p className="text-2xl font-bold text-purple-600">{data.today_stats.new_posts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Session Status</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={sessionStatusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Today's Activity</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar 
                data={activityData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      {data.active_chat_sessions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Active Chat Sessions</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.active_chat_sessions.map((session: any) => (
                <div key={session.session_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{session.category}</p>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(session.started_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {session.unread_messages > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {session.unread_messages} new
                      </span>
                    )}
                    <Button size="sm">Join Chat</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Important Notices</h3>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.notifications.map((notice: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">ℹ️</span>
                <span className="text-sm text-gray-700">{notice}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
};

const AdminDashboard: React.FC<{ data: any }> = ({ data }) => {
  const { systemStats, platformStats } = data;

  const userGrowthData = {
    labels: ['New Users', 'Active Users', 'Total Users'],
    datasets: [
      {
        label: 'User Statistics',
        data: [
          platformStats.user_stats.new_users,
          platformStats.user_stats.active_users,
          platformStats.user_stats.total_users,
        ],
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      },
    ],
  };

  const contentData = {
    labels: ['Public Posts', 'Private Posts', 'New Posts'],
    datasets: [
      {
        label: 'Content Statistics',
        data: [
          platformStats.content_stats.public_posts,
          platformStats.content_stats.private_posts,
          platformStats.content_stats.new_posts,
        ],
        backgroundColor: '#10B981',
        borderRadius: 4,
      },
    ],
  };

  return (
    <>
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{systemStats.total_users}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Posts</p>
                <p className="text-2xl font-bold text-green-600">{systemStats.total_posts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">💬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-purple-600">{systemStats.total_sessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Reports</p>
                <p className="text-2xl font-bold text-red-600">{systemStats.pending_reports}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">User Growth</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar 
                data={userGrowthData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Content Statistics</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar 
                data={contentData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">System Status</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-green-800">System Health</p>
                  <p className="text-sm text-green-600">{systemStats.system_health}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-blue-800">Active Staff</p>
                  <p className="text-sm text-blue-600">{platformStats.system_stats.total_staff} members</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium text-purple-800">Active Counselors</p>
                  <p className="text-sm text-purple-600">{platformStats.system_stats.active_counselors} available</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default StaffDashboard;