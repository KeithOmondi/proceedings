// store/slices/pendingProceedingsSlice.ts

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import axiosClient from "../../api/api";

// ============================================================
// TYPES — Frontend definitions matching backend schemas
// ============================================================

export interface PendingProceedingItem {
  division: string;
  name: string;
  quantity: number;
}

export type SubmissionStatus = 'submitted';

export interface StationRequirementSubmission {
  id?: string;
  station: string;
  courtOfAppeal: PendingProceedingItem[];
  subordinateCourts: PendingProceedingItem[];
  status: SubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  submittedBy?: string;
  submitterName?: string;
  submitterEmail?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  emailError?: string;
}

export interface StationRequirementSummary {
  id?: string;
  station: string;
  courtOfAppealTotal: number;
  subordinateCourtsTotal: number;
  status: SubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  submitterName?: string;
}

export interface SubmissionStats {
  totalStations: number;
  submitted: number;
  notSubmitted: number;
  notStarted: number;
  nilReturnCount: number;  // ✅ Added
}

export interface CategoryItem {
  category: string;
  items: string[];
}

// ============================================================
// API RESPONSE SHAPES
// ============================================================

export interface SubmissionsListResponse {
  submissions: StationRequirementSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SubmissionResponse {
  submission: StationRequirementSubmission;
  message?: string;
}

interface ApiErrorResponse {
  message?: string;
  status?: string;
}

// ============================================================
// INPUT PAYLOAD TYPES
// ============================================================

export interface CreateSubmissionInput {
  station: string;
  courtOfAppeal: PendingProceedingItem[];
  subordinateCourts: PendingProceedingItem[];
}

export interface UpdateSubmissionInput {
  station?: string;
  courtOfAppeal?: PendingProceedingItem[];
  subordinateCourts?: PendingProceedingItem[];
}

export interface GetSubmissionsQuery {
  station?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'submittedAt' | 'station';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminDashboardStats {
  totalStations: number;
  submissionsToday: number;
  submittedCount: number;
  notStartedCount: number;
  nilReturnCount: number;  // ✅ Added
  completionRate: number;
  recentActivity: Array<{
    id: string;
    station: string;
    action: 'submitted' | 'updated';
    timestamp: string;
    user: string;
    details?: string;
  }>;
}

export interface ReportData {
  rows: Array<{
    'Station': string;
    'Assigned DR': string;
    'DR Email': string;
    'Submission Status': 'Submitted' | 'Not Submitted';
    'Court of Appeal Items': number;
    'Subordinate Courts Items': number;
    'Total Items': number;
    'Nil Return': boolean;  // ✅ Added
    'Submitted At': string;
    'Last Updated': string;
  }>;
  summary: {
    totalStations: number;
    submitted: number;
    notSubmitted: number;
    totalCourtOfAppeal: number;
    totalSubordinateCourts: number;
    nilReturnCount: number;  // ✅ Added
    completionRate: number;
  };
}

// ============================================================
// STATE INTERFACE & INITIAL STATE
// ============================================================

interface PendingProceedingsState {
  submissions: StationRequirementSummary[];
  currentSubmission: StationRequirementSubmission | null;
  stats: SubmissionStats | null;
  categories: CategoryItem[];
  dashboardStats: AdminDashboardStats | null;
  reportData: ReportData | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: PendingProceedingsState = {
  submissions: [],
  currentSubmission: null,
  stats: null,
  categories: [],
  dashboardStats: null,
  reportData: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const calculateTotals = (items: PendingProceedingItem[]): number => {
  return items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
};

const createSummary = (submission: StationRequirementSubmission): StationRequirementSummary => ({
  id: submission.id,
  station: submission.station,
  courtOfAppealTotal: calculateTotals(submission.courtOfAppeal),
  subordinateCourtsTotal: calculateTotals(submission.subordinateCourts),
  status: submission.status,
  submittedAt: submission.submittedAt,
  updatedAt: submission.updatedAt,
  submitterName: submission.submitterName,
});

// ============================================================
// ASYNC THUNKS — Submissions
// ============================================================

export const getSubmissions = createAsyncThunk<
  SubmissionsListResponse,
  GetSubmissionsQuery | void,
  { rejectValue: string }
>(
  "pendingProceedings/getSubmissions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const cleanParams: Record<string, string | number> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            cleanParams[key] = value;
          }
        });
      }
      if (!cleanParams.page) cleanParams.page = 1;
      if (!cleanParams.limit) cleanParams.limit = 20;
      if (!cleanParams.sortBy) cleanParams.sortBy = "updatedAt";
      if (!cleanParams.sortOrder) cleanParams.sortOrder = "desc";

      const response = await axiosClient.get("/pending-proceedings", { params: cleanParams });
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to fetch submissions:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch submissions.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const getMySubmissions = createAsyncThunk<
  SubmissionsListResponse,
  GetSubmissionsQuery | void,
  { rejectValue: string }
>(
  "pendingProceedings/getMySubmissions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const cleanParams: Record<string, string | number> = {};
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            cleanParams[key] = value;
          }
        });
      }
      if (!cleanParams.page) cleanParams.page = 1;
      if (!cleanParams.limit) cleanParams.limit = 20;
      if (!cleanParams.sortBy) cleanParams.sortBy = "updatedAt";
      if (!cleanParams.sortOrder) cleanParams.sortOrder = "desc";

      const response = await axiosClient.get("/pending-proceedings/my-submissions", { params: cleanParams });
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to fetch my submissions:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch my submissions.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const getSubmissionById = createAsyncThunk<
  { submission: StationRequirementSubmission },
  string,
  { rejectValue: string }
>(
  "pendingProceedings/getSubmissionById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/pending-proceedings/${id}`);
      
      if (!response.data?.data?.submission) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch submission.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const createSubmission = createAsyncThunk<
  { submission: StationRequirementSubmission },
  CreateSubmissionInput,
  { rejectValue: string }
>(
  "pendingProceedings/createSubmission",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post("/pending-proceedings", payload);
      
      console.log("📤 Create submission response:", response.data);
      
      if (!response.data?.data?.submission) {
        console.error("❌ Invalid response structure:", response.data);
        return rejectWithValue("Invalid response structure from server");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to create submission:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to create submission.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const updateSubmission = createAsyncThunk<
  { submission: StationRequirementSubmission },
  { id: string; data: UpdateSubmissionInput },
  { rejectValue: string }
>(
  "pendingProceedings/updateSubmission",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/pending-proceedings/${id}`, data);
      
      console.log("📤 Update submission response:", response.data);
      
      if (!response.data?.data?.submission) {
        console.error("❌ Invalid response structure:", response.data);
        return rejectWithValue("Invalid response structure from server");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to update submission:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to update submission.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const deleteSubmission = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "pendingProceedings/deleteSubmission",
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/pending-proceedings/${id}`);
      return id;
    } catch (err: unknown) {
      console.error("❌ Failed to delete submission:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to delete submission.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

// ============================================================
// ASYNC THUNKS — Stats & Dashboard
// ============================================================

export const getSubmissionStats = createAsyncThunk<
  { stats: SubmissionStats },
  void,
  { rejectValue: string }
>(
  "pendingProceedings/getSubmissionStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get("/pending-proceedings/stats");
      
      if (!response.data?.data?.stats) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to fetch submission stats:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch submission stats.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

export const getAdminDashboard = createAsyncThunk<
  { data: AdminDashboardStats },
  void,
  { rejectValue: string }
>(
  "pendingProceedings/getAdminDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get("/pending-proceedings/dashboard");
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to fetch admin dashboard:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch admin dashboard.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

// ============================================================
// ASYNC THUNKS — Categories
// ============================================================

export const getCategories = createAsyncThunk<
  { data: CategoryItem[] },
  void,
  { rejectValue: string }
>(
  "pendingProceedings/getCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get("/pending-proceedings/categories");
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to fetch categories:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to fetch categories.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

// ============================================================
// ASYNC THUNKS — Reports
// ============================================================

export const downloadReport = createAsyncThunk<
  { data: ReportData; format: string } | Blob,
  { format?: 'pdf' | 'docx' | 'json'; fromDate?: string; toDate?: string },
  { rejectValue: string }
>(
  "pendingProceedings/downloadReport",
  async ({ format = 'json', fromDate, toDate }, { rejectWithValue }) => {
    try {
      const params: Record<string, string> = { format };
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      
      // ✅ For PDF and DOCX, get blob response
      if (format === 'pdf' || format === 'docx') {
        const response = await axiosClient.get("/pending-proceedings/download-report", { 
          params, 
          responseType: 'blob' 
        });
        return response.data as Blob;
      }
      
      // ✅ For JSON, get the data
      const response = await axiosClient.get("/pending-proceedings/download-report", { params });
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return { data: response.data.data, format: 'json' };
    } catch (err: unknown) {
      console.error("❌ Failed to download report:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to download report.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

// ============================================================
// ASYNC THUNKS — Bulk Operations
// ============================================================

export const bulkUpsertSubmissions = createAsyncThunk<
  { 
    results: StationRequirementSubmission[];
    errors: Array<{ station: string; error: string }>;
    summary: { total: number; successful: number; failed: number };
  },
  Array<{ id?: string; station: string; courtOfAppeal: PendingProceedingItem[]; subordinateCourts: PendingProceedingItem[] }>,
  { rejectValue: string }
>(
  "pendingProceedings/bulkUpsertSubmissions",
  async (submissions, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post("/pending-proceedings/bulk", { submissions });
      
      if (!response.data?.data) {
        throw new Error("Invalid response structure");
      }
      
      return response.data.data;
    } catch (err: unknown) {
      console.error("❌ Failed to bulk upsert submissions:", err);
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        return rejectWithValue(err.response?.data?.message || "Failed to bulk upsert submissions.");
      }
      return rejectWithValue("An unexpected error occurred.");
    }
  }
);

// ============================================================
// SLICE DEFINITION
// ============================================================

const pendingProceedingsSlice = createSlice({
  name: "pendingProceedings",
  initialState,
  reducers: {
    clearCurrentSubmission: (state) => {
      state.currentSubmission = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetPagination: (state) => {
      state.pagination = { page: 1, limit: 20, total: 0 };
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
    },
    clearDashboardStats: (state) => {
      state.dashboardStats = null;
    },
    clearReportData: (state) => {
      state.reportData = null;
    },
    clearCategories: (state) => {
      state.categories = [];
    },
    clearStats: (state) => {
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------- getSubmissions ----------
      .addCase(getSubmissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSubmissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = action.payload.submissions || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
        };
      })
      .addCase(getSubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch submissions";
      })

      // ---------- getMySubmissions ----------
      .addCase(getMySubmissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMySubmissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = action.payload.submissions || [];
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total || 0,
        };
      })
      .addCase(getMySubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch my submissions";
      })

      // ---------- getSubmissionById ----------
      .addCase(getSubmissionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSubmissionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSubmission = action.payload.submission;
      })
      .addCase(getSubmissionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch submission";
      })

      // ---------- createSubmission ----------
      .addCase(createSubmission.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createSubmission.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        const submission = action.payload?.submission;
        if (!submission) {
          console.error("❌ No submission in payload:", action.payload);
          state.error = "Invalid response from server";
          return;
        }
        
        state.currentSubmission = submission;
        state.submissions.unshift(createSummary(submission));
      })
      .addCase(createSubmission.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to create submission";
      })

      // ---------- updateSubmission ----------
      .addCase(updateSubmission.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateSubmission.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        const submission = action.payload?.submission;
        if (!submission) {
          console.error("❌ No submission in payload:", action.payload);
          state.error = "Invalid response from server";
          return;
        }
        
        state.currentSubmission = submission;
        const index = state.submissions.findIndex((s) => s.id === submission.id);
        if (index !== -1) {
          state.submissions[index] = createSummary(submission);
        }
      })
      .addCase(updateSubmission.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to update submission";
      })

      // ---------- deleteSubmission ----------
      .addCase(deleteSubmission.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSubmission.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = state.submissions.filter((s) => s.id !== action.payload);
        if (state.currentSubmission?.id === action.payload) state.currentSubmission = null;
      })
      .addCase(deleteSubmission.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to delete submission";
      })

      // ---------- getSubmissionStats ----------
      .addCase(getSubmissionStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSubmissionStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload.stats;
      })
      .addCase(getSubmissionStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch submission stats";
      })

      // ---------- getAdminDashboard ----------
      .addCase(getAdminDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAdminDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardStats = action.payload.data;
      })
      .addCase(getAdminDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch admin dashboard";
      })

      // ---------- getCategories ----------
      .addCase(getCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload.data || [];
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch categories";
      })

      // ---------- downloadReport ----------
      .addCase(downloadReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(downloadReport.fulfilled, (state, action) => {
        state.isLoading = false;
        // Only set reportData if it's JSON format (has data property)
        if (action.payload && typeof action.payload === 'object' && 'data' in action.payload) {
          state.reportData = action.payload.data;
        }
        // For PDF/DOCX (Blob), we don't store in state
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to download report";
      })

      // ---------- bulkUpsertSubmissions ----------
      .addCase(bulkUpsertSubmissions.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(bulkUpsertSubmissions.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        const results = action.payload.results || [];
        for (const result of results) {
          const existingIndex = state.submissions.findIndex((s) => s.id === result.id);
          const summary = createSummary(result);
          if (existingIndex !== -1) {
            state.submissions[existingIndex] = summary;
          } else {
            state.submissions.unshift(summary);
          }
        }
      })
      .addCase(bulkUpsertSubmissions.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Failed to bulk upsert submissions";
      });
  },
});

export const {
  clearCurrentSubmission,
  clearError,
  resetPagination,
  setPage,
  setLimit,
  clearDashboardStats,
  clearReportData,
  clearCategories,
  clearStats,
} = pendingProceedingsSlice.actions;

export default pendingProceedingsSlice.reducer;