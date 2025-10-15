import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/UI';
import { staffApi, DashboardStats, UserStats, SessionStats, PostStats } from '@/api/staff';
import { useStaffAuthStore } from '@/store/staffAuthStore';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StaffDashboardPage: React.FC = () => {
  const { staff } = useStaffAuthStore();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [postStats, setPostStats] = useState<PostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, userData, sessionData, postData] = await Promise.all([
        staffApi.getDashboardStats(),
        staffApi.getUserStats(),
        staffApi.getSessionStats(),
        staffApi.getPostStats(),
      ]);

      setDashboardStats(dashboardData);
      setUserStats(userData);
      setSessionStats(sessionData);
      setPostStats(postData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserActivityChartData = () => {
    if (!userStats) return null;

    return {
      labels: ['Today', 'This Week', 'This Month'],
      datasets: [
        {
          label: 'New Users',
          data: [userStats.new_users_today, userStats.new_users_this_week, userStats.new_users_this_month],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Active Users',
          data: [userStats.active_users_today, userStats.active_users_this_week, 0], // No monthly active data
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  const getSessionStatusChartData = () => {
    if (!sessionStats) return null;

    return {
      labels: ['Completed', 'Cancelled', 'In Progress'],
      datasets: [
        {
          data: [
            sessionStats.completion_rate,
            sessionStats.cancellation_rate,
            100 - sessionStats.completion_rate - sessionStats.cancellation_rate,
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(59, 130, 246, 0.8)',
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
            'rgb(59, 130, 246)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getPostActivityChartData = () => {
    if (!postStats) return null;

    return {
      labels: ['Today', 'This Week', 'This Month'],
      datasets: [
        {
          label: 'Posts Created',
          data: [postStats.posts_today, postStats.posts_this_week, postStats.posts_this_month],
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1,
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {staff?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with OnMaum today.
        </p>
      </div>

      {/* Key Metrics */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_users.toLocaleString()}</p>
                  <p className="text-xs text-blue-600">+{dashboardStats.active_users_today} active today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-green-600 text-sm font-medium">💬</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_sessions.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+{dashboardStats.sessions_today} today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="text-purple-600 text-sm font-medium">📝</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_posts.toLocaleString()}</p>
                  <p className="text-xs text-purple-600">+{dashboardStats.posts_today} today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <span className="text-red-600 text-sm font-medium">🚨</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.pending_reports}</p>
                  <p className="text-xs text-red-600">Needs attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        {userStats && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Line
                  data={getUserActivityChartData()!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: false,
                      },
                    },
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
        )}

        {/* Session Status Chart */}
        {sessionStats && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Session Status Distribution</h3>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut
                  data={getSessionStatusChartData()!}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Post Activity Chart */}
      {postStats && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Post Activity</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={getPostActivityChartData()!}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
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
      )}

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sessionStats && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Session Performance</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-medium text-green-600">
                    {sessionStats.completion_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Duration</span>
                  <span className="text-sm font-medium">
                    {sessionStats.average_session_duration.toFixed(0)} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cancellation Rate</span>
                  <span className="text-sm font-medium text-red-600">
                    {sessionStats.cancellation_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userStats && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span className="text-sm font-medium text-blue-600">
                    {userStats.user_growth_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New This Week</span>
                  <span className="text-sm font-medium">
                    {userStats.new_users_this_week}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active This Week</span>
                  <span className="text-sm font-medium">
                    {userStats.active_users_this_week}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {postStats && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Content Stats</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Public Posts</span>
                  <span className="text-sm font-medium">
                    {postStats.public_posts.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Private Posts</span>
                  <span className="text-sm font-medium">
                    {postStats.private_posts.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Empathy</span>
                  <span className="text-sm font-medium text-purple-600">
                    {postStats.average_empathy_count.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StaffDashboardPage;