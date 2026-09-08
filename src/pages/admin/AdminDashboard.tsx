// pages/admin/AdminDashboard.tsx

import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getSubmissionStats,
  getAdminDashboard,
  clearError,
} from '../../store/slices/formBuilderSlice';
import type { AppDispatch, RootState } from '../../store/store';

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    stats,
    dashboardStats,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.pendingProceedings);
  const { accessToken, isInitializing } = useSelector((state: RootState) => state.auth);

  // ✅ Define loadData with useCallback before it's used in useEffect
  const loadData = useCallback(() => {
    dispatch(getSubmissionStats());
    dispatch(getAdminDashboard());
  }, [dispatch]);

  // Load data on mount
  useEffect(() => {
    if (!isInitializing && accessToken) {
      loadData();
    }
  }, [isInitializing, accessToken, loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading, loadData]);

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#12253d] to-[#1e3a5f] text-[#f3efe4] p-8 rounded-lg mb-8 border-b-4 border-[#a3782e]">
          <div className="text-xs uppercase tracking-widest text-[#c9b98a] mb-2">
            Admin Dashboard
          </div>
          <h1 className="text-2xl font-semibold mb-2">Pending Proceedings Overview</h1>
          <p className="text-sm text-[#c9b98a]">
            Monitor and track pending proceedings submissions across all stations
          </p>
        </div>

        {/* Stats Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Total Stations</div>
                  <div className="text-3xl font-bold text-[#1e3a5f]">{dashboardStats.totalStations}</div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Submitted</div>
                  <div className="text-3xl font-bold text-green-600">{dashboardStats.submittedCount}</div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Not Started</div>
                  <div className="text-3xl font-bold text-gray-600">{dashboardStats.notStartedCount}</div>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Completion Rate</div>
                  <div className="text-3xl font-bold text-[#a3782e]">{dashboardStats.completionRate}%</div>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Submission Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-600">Total Stations</span>
                <span className="block text-xl font-semibold">{stats.totalStations}</span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-600">Submitted</span>
                <span className="block text-xl font-semibold text-green-600">{stats.submitted}</span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-600">Not Submitted</span>
                <span className="block text-xl font-semibold text-gray-600">{stats.notSubmitted}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Not Started</span>
                <span className="block text-xl font-semibold text-red-600">{stats.notStarted}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Activity</h3>
              <Link
                to="/admin/pending-proceedings"
                className="text-sm text-[#1e3a5f] hover:text-[#12253d] font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {dashboardStats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.action === 'submitted' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <span className="font-medium text-gray-800">{activity.station}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {activity.action === 'submitted' ? 'submitted' : 'updated'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {activity.user}
                    <span className="ml-2">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/pending-proceedings"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">View Submissions</h4>
            <p className="text-sm text-gray-600">Manage all pending proceedings submissions</p>
          </Link>

          <Link
            to="/admin/users"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">Manage Users</h4>
            <p className="text-sm text-gray-600">Add, edit, or remove users</p>
          </Link>

          <Link
            to="/admin/pending-proceedings?report=true"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-[#a3782e] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">Download Report</h4>
            <p className="text-sm text-gray-600">Export submissions data</p>
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-md">
            ✗ {error}
            <button
              onClick={() => dispatch(clearError())}
              className="ml-4 text-sm font-semibold hover:text-red-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;