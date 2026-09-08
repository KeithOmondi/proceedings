// AdminPendingP.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getSubmissions,
  getSubmissionStats,
  getAdminDashboard,
  downloadReport,
  deleteSubmission,
  clearError,
} from '../../store/slices/formBuilderSlice';
import type { AppDispatch, RootState } from '../../store/store';

const AdminPendingP: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    submissions = [], // Default to empty array
    isLoading,
    error,
    pagination,
  } = useSelector((state: RootState) => state.pendingProceedings);
  const { accessToken, isInitializing } = useSelector((state: RootState) => state.auth);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [reportFormat, setReportFormat] = useState<'pdf' | 'docx' | 'json'>('pdf');
  const [isDownloading, setIsDownloading] = useState(false);

  // Load data function - declared before useEffect
  const loadData = useCallback(() => {
    dispatch(getSubmissions({
      page: pagination.page,
      limit: pagination.limit,
    }));
    dispatch(getSubmissionStats());
    dispatch(getAdminDashboard());
  }, [dispatch, pagination.page, pagination.limit]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (!isInitializing && accessToken) {
      loadData();
    }
  }, [isInitializing, accessToken, loadData]);

  const handlePageChange = (newPage: number) => {
    dispatch(getSubmissions({
      page: newPage,
      limit: pagination.limit,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(getSubmissions({
      page: 1,
      limit: newLimit,
    }));
  };

  const handleSearch = () => {
    dispatch(getSubmissions({
      station: searchTerm || undefined,
      page: 1,
      limit: pagination.limit,
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange({ from: '', to: '' });
    dispatch(getSubmissions({
      page: 1,
      limit: pagination.limit,
    }));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteSubmission(deleteId)).unwrap();
      setShowDeleteModal(false);
      setDeleteId(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const result = await dispatch(downloadReport({
        format: reportFormat,
        fromDate: dateRange.from || undefined,
        toDate: dateRange.to || undefined,
      })).unwrap();

      // If format is JSON, display the data
      if (reportFormat === 'json') {
        console.log('Report data:', result.data);
      } else {
        // For PDF/DOCX, handle download
        // This will depend on your API response format
        // If the API returns a blob, you can use:
        // const blob = new Blob([result], { type: 'application/pdf' });
        // const url = window.URL.createObjectURL(blob);
        // const link = document.createElement('a');
        // link.href = url;
        // link.download = `pending-proceedings-report.${reportFormat}`;
        // link.click();
      }
    } catch (err) {
      console.error('Failed to download report:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      submitted: { color: 'bg-green-100 text-green-800', label: 'Submitted' },
      not_started: { color: 'bg-gray-100 text-gray-800', label: 'Not Started' },
    };
    const info = statusMap[status] || statusMap.not_started;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
  };

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

  // Calculate hasMore from pagination
  const hasMore = pagination?.page * pagination?.limit < pagination?.total;

  return (
    <div className="min-h-screen bg-[#f7f5f0] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#12253d] to-[#1e3a5f] text-[#f3efe4] p-8 rounded-lg mb-8 border-b-4 border-[#a3782e]">
          <div className="text-xs uppercase tracking-widest text-[#c9b98a] mb-2">
            Admin Dashboard · Pending Proceedings
          </div>
          <h1 className="text-2xl font-semibold mb-2">Pending Proceedings Management</h1>
          <p className="text-sm text-[#c9b98a]">
            Monitor and manage submissions for pending proceedings across all stations
          </p>
        </div>





        {/* Filters */}
        <div className="bg-white border border-gray-300 rounded-lg p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">Search Station</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by station..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="submitted">Submitted</option>
                <option value="not_started">Not Started</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#1e3a5f] text-white font-semibold rounded-md hover:bg-[#12253d] transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-400 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Report Download */}
        <div className="bg-white border border-gray-300 rounded-lg p-4 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">Report Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as 'pdf' | 'docx' | 'json')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="px-4 py-2 bg-[#a3782e] text-white font-semibold rounded-md hover:bg-[#8a6626] transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Downloading...' : 'Download Report'}
            </button>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Station</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-600">Submitter</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Court of Appeal</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Subordinate Courts</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Submitted At</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!submissions || submissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {submission.station}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {submission.submitterName || 'N/A'}
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
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            console.log('View submission:', submission.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-2"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(submission.id || null);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-300 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={pagination?.limit || 20}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {pagination?.total > 0 ? (
                <>Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</>
              ) : (
                'No results'
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination?.page - 1 || 1)}
                disabled={pagination?.page === 1 || !pagination}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination?.page + 1 || 2)}
                disabled={!hasMore}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-md">
            ✗ {error}
            <button
              onClick={() => dispatch(clearError())}
              className="ml-4 text-sm font-semibold hover:text-red-600"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this submission? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPendingP;