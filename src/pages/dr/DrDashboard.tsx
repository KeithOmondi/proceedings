// pages/dr/DrDashboard.tsx

import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getMySubmissions,
  getSubmissionStats,
  clearError,
} from '../../store/slices/formBuilderSlice';
import type { AppDispatch, RootState } from '../../store/store';

const DrDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    submissions,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.pendingProceedings);
  const { user, accessToken, isInitializing } = useSelector((state: RootState) => state.auth);

  // ✅ Load data
  const loadData = useCallback(() => {
    dispatch(getMySubmissions({
      page: 1,
      limit: 10,
    }));
    dispatch(getSubmissionStats());
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

  // Get user's station name
  const userStation = user?.station || 'Your Station';

  // Get the latest submission for the user's station
  const userSubmission = submissions.find(s => s.station === userStation);

  return (
    <div className="min-h-screen bg-[#f7f5f0] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#12253d] to-[#1e3a5f] text-[#f3efe4] p-8 rounded-lg mb-8 border-b-4 border-[#a3782e]">
          <div className="text-xs uppercase tracking-widest text-[#c9b98a] mb-2">
            DR Dashboard
          </div>
          <h1 className="text-2xl font-semibold mb-2">Welcome back, {user?.fullName || 'DR'}</h1>
          <p className="text-sm text-[#c9b98a]">
            {userStation} · {user?.designation || 'District Registrar'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">My Submissions</div>
                <div className="text-3xl font-bold text-[#1e3a5f]">
                  {userSubmission ? 1 : 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Court of Appeal Items</div>
                <div className="text-3xl font-bold text-amber-600">
                  {userSubmission?.courtOfAppealTotal || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Subordinate Courts Items</div>
                <div className="text-3xl font-bold text-purple-600">
                  {userSubmission?.subordinateCourtsTotal || 0}
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Your Submission Status</h3>
          {userSubmission ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-600">Status</span>
                <span className="block text-lg font-semibold text-green-600">
                  Submitted
                </span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="text-xs text-gray-600">Submitted On</span>
                <span className="block text-lg font-semibold">
                  {userSubmission.submittedAt 
                    ? new Date(userSubmission.submittedAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Total Items</span>
                <span className="block text-lg font-semibold">
                  {(userSubmission.courtOfAppealTotal || 0) + (userSubmission.subordinateCourtsTotal || 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">You haven't submitted any pending proceedings yet.</p>
              <Link
                to="/pending-proceedings"
                className="inline-block px-6 py-2 bg-[#1e3a5f] text-white font-semibold rounded-md hover:bg-[#12253d] transition-colors"
              >
                Submit Now →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/pending-proceedings"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">{userSubmission ? 'Update Submission' : 'New Submission'}</h4>
            <p className="text-sm text-gray-600">
              {userSubmission ? 'Update your pending proceedings' : 'Submit your pending proceedings'}
            </p>
          </Link>

          <Link
            to="/pending-proceedings"
            className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">View Submission</h4>
            <p className="text-sm text-gray-600">View your submitted data</p>
          </Link>

          <div className="bg-white border border-gray-300 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800">Need Help?</h4>
            <p className="text-sm text-gray-600">Contact the RHC office for assistance</p>
          </div>
        </div>

        {/* Recent Submissions Table */}
        {submissions.length > 0 && (
          <div className="mt-8 bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Your Recent Submissions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Station</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Court of Appeal</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Subordinate Courts</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.slice(0, 5).map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {submission.station}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {submission.courtOfAppealTotal}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {submission.subordinateCourtsTotal}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold">
                        {submission.courtOfAppealTotal + submission.subordinateCourtsTotal}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

export default DrDashboard;