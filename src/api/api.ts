// src/api/api.ts

import axios, { 
  type AxiosRequestConfig, 
  type InternalAxiosRequestConfig,
  type AxiosResponse
} from 'axios';
import type { UnknownAction } from '@reduxjs/toolkit';

// A strict structural interface for the slice fields we care about reading dynamically
interface SharedStoreStructure {
  getState: () => {
    auth: {
      accessToken: string | null;
    };
  };
  dispatch: (action: UnknownAction) => UnknownAction;
}

let storeRef: SharedStoreStructure | null = null;

export const injectStore = (store: SharedStoreStructure): void => {
  storeRef = store;
};

// Types for the store actions
export interface AuthActions {
  refreshAccessToken: () => Promise<unknown>;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

export const setupApiWithStore = (
  store: SharedStoreStructure,
  authActions?: AuthActions
): void => {
  injectStore(store);
  if (authActions) {
    (window as Window & { __authActions?: AuthActions }).__authActions = authActions;
  }
};

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Constants
const MAX_RETRY_ATTEMPTS = 2;
const REFRESH_TOKEN_ENDPOINT = '/auth/refresh';
const PUBLIC_ROUTE_PATTERN = '/public/';

// ✅ Get the API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

console.log('📡 API Base URL:', API_URL);
console.log('🌐 Environment:', import.meta.env.MODE);

export const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // ✅ Important: Send cookies with requests
});

// ============================================================
// 1. REQUEST INTERCEPTOR
// ============================================================
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip adding auth token for public routes
    if (config.url?.includes(PUBLIC_ROUTE_PATTERN)) {
      return config;
    }

    // ✅ Try to get token from store first, then localStorage as fallback
    let accessToken = storeRef?.getState().auth.accessToken;
    
    if (!accessToken) {
      // Fallback to localStorage
      try {
        accessToken = localStorage.getItem('accessToken');
      } catch {
        // Ignore
      }
    }
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // ✅ Log request in development
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ============================================================
// 2. RESPONSE INTERCEPTOR (AUTOMATIC TOKEN REFRESH)
// ============================================================
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // ✅ Log response in development
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: unknown) => {
    // Type guard for AxiosError
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as CustomAxiosRequestConfig;

    // If no config, reject immediately
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Skip token refresh for:
    // 1. Public routes (they don't need auth)
    // 2. Refresh token requests (to avoid infinite loops)
    const isPublicRoute = originalRequest.url?.includes(PUBLIC_ROUTE_PATTERN);
    const isRefreshRequest = originalRequest.url?.includes(REFRESH_TOKEN_ENDPOINT);

    if (isPublicRoute || isRefreshRequest) {
      return Promise.reject(error);
    }

    // Initialize retry count if not set
    if (originalRequest._retryCount === undefined) {
      originalRequest._retryCount = 0;
    }

    // ✅ Log the error
    console.error(`❌ API Error: ${originalRequest.url}`, {
      status: error.response?.status,
      message: error.message,
      retryCount: originalRequest._retryCount,
    });

    // Only handle 401 errors and limit retry attempts
    if (
      error.response?.status === 401 && 
      originalRequest._retryCount < MAX_RETRY_ATTEMPTS
    ) {
      originalRequest._retryCount += 1;
      originalRequest._retry = true;

      console.log(`🔄 Attempting token refresh (attempt ${originalRequest._retryCount})...`);

      try {
        // ✅ Attempt to refresh the token using the same axiosClient (with credentials)
        const refreshResponse = await axiosClient.post(
          REFRESH_TOKEN_ENDPOINT,
          {},
          {
            withCredentials: true,
            timeout: 10000,
          }
        );

        // Validate refresh response structure
        const accessToken = refreshResponse.data?.data?.accessToken || 
                           refreshResponse.data?.accessToken;

        if (!accessToken) {
          throw new Error('Invalid refresh response: missing access token');
        }

        console.log('✅ Token refreshed successfully');

        // ✅ Store the new token
        if (storeRef) {
          storeRef.dispatch({
            type: 'auth/setAccessToken',
            payload: accessToken
          } as UnknownAction);
        }
        
        // ✅ Also store in localStorage as fallback
        localStorage.setItem('accessToken', accessToken);

        // Update the original request with the new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Retry the original request
        return axiosClient(originalRequest as InternalAxiosRequestConfig);
      } catch (refreshError: unknown) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // ✅ Clear auth state on refresh failure
        if (storeRef) {
          storeRef.dispatch({
            type: 'auth/logout'
          } as UnknownAction);
        }
        localStorage.removeItem('accessToken');
        
        // ✅ Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // For 401 errors with no retry attempts left
    if (error.response?.status === 401) {
      console.error('❌ Unauthorized - no retry attempts left');
      if (storeRef) {
        storeRef.dispatch({
          type: 'auth/logout'
        } as UnknownAction);
      }
      localStorage.removeItem('accessToken');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// 3. HELPER FUNCTIONS
// ============================================================

/**
 * Manually refresh the token
 */
export const manualRefreshToken = async (): Promise<string | null> => {
  try {
    const response = await axiosClient.post(
      REFRESH_TOKEN_ENDPOINT,
      {},
      { withCredentials: true }
    );
    const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      if (storeRef) {
        storeRef.dispatch({
          type: 'auth/setAccessToken',
          payload: accessToken
        } as UnknownAction);
      }
      return accessToken;
    }
    return null;
  } catch (error) {
    console.error('❌ Manual token refresh failed:', error);
    return null;
  }
};

/**
 * Check if the current token is valid
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  
  try {
    // Decode the JWT to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = exp - now;
    
    // Token is valid if it expires in more than 1 minute
    return timeUntilExpiry > 60000;
  } catch {
    return false;
  }
};

/**
 * Get the current token
 */
export const getToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export default axiosClient;