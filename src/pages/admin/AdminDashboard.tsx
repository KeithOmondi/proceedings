// pages/admin/AdminDashboard.tsx

import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getSubmissionStats,
  getAdminDashboard,
  getSubmissions,
  clearError,
} from '../../store/slices/formBuilderSlice';
import type { AppDispatch, RootState } from '../../store/store';

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    stats,
    dashboardStats,
    submissions,
    isLoading,
    error,
    //pagination,
  } = useSelector((state: RootState) => state.pendingProceedings);
  const { accessToken, isInitializing } = useSelector((state: RootState) => state.auth);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // ✅ Load data
  const loadData = useCallback(() => {
    dispatch(getSubmissionStats());
    dispatch(getAdminDashboard());
    dispatch(getSubmissions({
      page: 1,
      limit: 100, // Fetch all stations
    }));
  }, [dispatch]);

  // Load data on mount
  useEffect(() => {
    if (!isInitializing && accessToken) {
      loadData();
    }
  }, [isInitializing, accessToken, loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadData();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoading, loadData]);

  // Calculate submission stats from submissions data
  const getSubmissionStatsFromData = () => {
    const total = submissions.length;
    const submitted = submissions.filter(s => s.status === 'submitted').length;
    const notSubmitted = total - submitted;
    
    return {
      total,
      submitted,
      notSubmitted,
      completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    };
  };

  // Get stations with their submission status
  const getStationStatuses = () => {
    return submissions.map(sub => ({
      station: sub.station,
      status: sub.status,
      courtOfAppealTotal: sub.courtOfAppealTotal || 0,
      subordinateCourtsTotal: sub.subordinateCourtsTotal || 0,
      totalItems: (sub.courtOfAppealTotal || 0) + (sub.subordinateCourtsTotal || 0),
      submittedAt: sub.submittedAt,
      submitterName: sub.submitterName || 'N/A',
    }));
  };

  // Filter stations by status
  const filteredStations = selectedStatus === 'all' 
    ? getStationStatuses()
    : getStationStatuses().filter(s => s.status === selectedStatus);

  const calculatedStats = getSubmissionStatsFromData();

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

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Total Stations</div>
                <div className="text-3xl font-bold text-[#1e3a5f]">{calculatedStats.total}</div>
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
                <div className="text-3xl font-bold text-green-600">{calculatedStats.submitted}</div>
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
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Not Submitted</div>
                <div className="text-3xl font-bold text-red-600">{calculatedStats.notSubmitted}</div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Completion Rate</div>
                <div className="text-3xl font-bold text-[#a3782e]">{calculatedStats.completionRate}%</div>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-[#1e3a5f]">{calculatedStats.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-[#1e3a5f] h-4 rounded-full transition-all duration-500"
              style={{ width: `${calculatedStats.completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{calculatedStats.submitted} Submitted</span>
            <span>{calculatedStats.notSubmitted} Not Submitted</span>
          </div>
        </div>

        {/* Stats Summary from API */}
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

        {/* Station List */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-semibold text-gray-800">All Stations</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filter:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Stations</option>
                <option value="submitted">Submitted</option>
                <option value="not_started">Not Submitted</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Station</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Submitter</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Court of Appeal</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Subordinate Courts</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No stations found
                    </td>
                  </tr>
                ) : (
                  filteredStations.map((station) => (
                    <tr key={station.station} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {station.station}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {station.submitterName}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {station.courtOfAppealTotal}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {station.subordinateCourtsTotal}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold">
                        {station.totalItems}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          station.status === 'submitted' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {station.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {station.submittedAt ? new Date(station.submittedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {filteredStations.length} of {getStationStatuses().length} stations
            </div>
          </div>
        </div>

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
            <h4 className="font-semibold text-gray-800">View All Submissions</h4>
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
          Auto-refreshes every 60 seconds
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;