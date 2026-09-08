// store/slices/authSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import axiosClient from '../../api/api';

// Define expected shape of backend error responses
interface ApiErrorResponse {
  message?: string;
  status?: string;
}

// Define types matching backend structure
export interface User {
  id: string;
  pjNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  station: string;
  designation: string;
  role: 'admin' | 'dr';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  maskedEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

// ✅ Load token from localStorage on initial state
const loadTokenFromStorage = (): string | null => {
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
};

const initialState: AuthState = {
  user: null,
  accessToken: loadTokenFromStorage(),
  maskedEmail: null,
  isAuthenticated: !!loadTokenFromStorage(),
  isLoading: false,
  isInitializing: true,
  error: null,
};

// --- ASYNC THUNKS ---

// Step 1: Request OTP
export const requestOtp = createAsyncThunk<
  { email: string },
  { pjNumber: string },
  { rejectValue: string }
>('auth/requestOtp', async (payload, { rejectWithValue }) => {
  try {
    console.log('📤 Requesting OTP for PJ:', payload.pjNumber);
    
    const response = await axiosClient.post('/auth/login/request-otp', payload);
    
    console.log('✅ OTP request response:', response.data);
    
    let email = '';
    
    if (response.data?.message) {
      const message = response.data.message;
      const emailMatch = message.match(/sent to (.+)$/);
      if (emailMatch) {
        email = emailMatch[1].trim();
      }
    }
    
    if (!email) {
      email = response.data?.data?.email || 
              response.data?.email || 
              response.data?.maskedEmail ||
              response.data?.data?.maskedEmail;
    }

    if (!email) {
      console.warn('Backend response missing expected email property:', response.data);
      return { email: 'your registered email' };
    }

    return { email };
  } catch (err: unknown) {
    console.error('❌ OTP request error:', err);
    if (axios.isAxiosError<ApiErrorResponse>(err)) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to send verification code.'
      );
    }
    return rejectWithValue('An unexpected error occurred processing response.');
  }
});

// Step 2: Verify OTP
export const verifyOtp = createAsyncThunk<
  { user: User; accessToken: string; refreshToken?: string },
  { pjNumber: string; otp: string },
  { rejectValue: string }
>('auth/verifyOtp', async (payload, { rejectWithValue }) => {
  try {
    console.log('📤 Verifying OTP for PJ:', payload.pjNumber);
    
    const response = await axiosClient.post('/auth/login/verify-otp', payload);
    const data = response.data.data;
    
    console.log('✅ OTP verification successful for:', data.user?.fullName);
    
    // ✅ Store token in localStorage
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    }
    
    return data;
  } catch (err: unknown) {
    console.error('❌ OTP verification error:', err);
    if (axios.isAxiosError<ApiErrorResponse>(err)) {
      return rejectWithValue(
        err.response?.data?.message || 'Invalid verification code.'
      );
    }
    return rejectWithValue('An unexpected error occurred.');
  }
});

// Step 3: Refresh Access Token
export const refreshAccessToken = createAsyncThunk<
  { accessToken: string },
  void,
  { rejectValue: string }
>('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    console.log('🔄 Refreshing access token...');
    
    const response = await axiosClient.post('/auth/refresh', {}, {
      withCredentials: true,
    });
    
    const data = response.data.data;
    const accessToken = data.accessToken;
    
    console.log('✅ Token refreshed successfully');
    
    // ✅ Store token in localStorage
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return data;
  } catch (err: unknown) {
    console.error('❌ Token refresh failed:', err);
    // ✅ Clear token on refresh failure
    localStorage.removeItem('accessToken');
    delete axiosClient.defaults.headers.common['Authorization'];
    
    if (axios.isAxiosError<ApiErrorResponse>(err)) {
      return rejectWithValue(
        err.response?.data?.message || 'Session expired. Please log in again.'
      );
    }
    return rejectWithValue('An unexpected error occurred.');
  }
});

// Step 4: Fetch Logged-in User Profile
export const fetchMe = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    console.log('📤 Fetching user profile...');
    
    const response = await axiosClient.get('/auth/me');
    const user = response.data.data;
    
    console.log('✅ User profile fetched:', user.fullName);
    
    return user;
  } catch (err: unknown) {
    console.error('❌ Fetch user profile error:', err);
    if (axios.isAxiosError<ApiErrorResponse>(err)) {
      // ✅ If 401, clear token
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        delete axiosClient.defaults.headers.common['Authorization'];
      }
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch user profile.'
      );
    }
    return rejectWithValue('An unexpected error occurred.');
  }
});

// Step 5: Check Auth (App Session Initialization)
export const checkAuth = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>('auth/checkAuth', async (_, { dispatch, rejectWithValue }) => {
  try {
    console.log('🔍 Checking auth...');
    console.log('📦 Token in localStorage:', !!localStorage.getItem('accessToken'));
    
    // ✅ First try to refresh the token (cookie should be sent automatically)
    const refreshResult = await dispatch(refreshAccessToken());
    
    // If refresh failed, try to fetch user with existing token
    if (refreshAccessToken.rejected.match(refreshResult)) {
      console.warn('⚠️ Token refresh failed, checking if we have a stored token...');
      
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        console.log('🔑 Found stored token, trying to fetch user...');
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          const user = await dispatch(fetchMe()).unwrap();
          console.log('✅ Auth check successful with stored token:', user.fullName);
          return user;
        } catch {
          console.warn('⚠️ Stored token is invalid, clearing...');
          localStorage.removeItem('accessToken');
          delete axiosClient.defaults.headers.common['Authorization'];
          return rejectWithValue('Invalid stored token');
        }
      }
      
      return rejectWithValue('No active session');
    }

    // Fetch user profile after successful refresh
    const user = await dispatch(fetchMe()).unwrap();
    console.log('✅ Auth check successful:', user.fullName);
    return user;
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    localStorage.removeItem('accessToken');
    delete axiosClient.defaults.headers.common['Authorization'];
    return rejectWithValue('Unauthenticated');
  }
});

// --- AUTH SLICE ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload);
      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${action.payload}`;
    },
    clearMaskedEmail: (state) => {
      state.maskedEmail = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      console.log('🔓 Logging out...');
      state.user = null;
      state.accessToken = null;
      state.maskedEmail = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isInitializing = false;
      
      localStorage.removeItem('accessToken');
      delete axiosClient.defaults.headers.common['Authorization'];
    },
  },
  extraReducers: (builder) => {
    builder
      // --- requestOtp ---
      .addCase(requestOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.maskedEmail = action.payload.email;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Something went wrong';
      })

      // --- verifyOtp ---
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.maskedEmail = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Verification failed';
      })

      // --- refreshAccessToken ---
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // ✅ Clear state on refresh failure
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        // Clear token from localStorage and axios headers
        localStorage.removeItem('accessToken');
        delete axiosClient.defaults.headers.common['Authorization'];
      })

      // --- fetchMe ---
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, () => {
        // Don't clear state here - let checkAuth handle it
        // Just log the error
        console.warn('⚠️ Fetch user profile failed');
      })

      // --- checkAuth ---
      .addCase(checkAuth.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitializing = false;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitializing = false;
        state.error = action.payload || 'Session expired';
        localStorage.removeItem('accessToken');
        delete axiosClient.defaults.headers.common['Authorization'];
      });
  },
});

export const { setAccessToken, clearMaskedEmail, clearError, logout } = authSlice.actions;
export default authSlice.reducer;