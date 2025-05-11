"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import apiClient from '../lib/apiClient'; // Import the apiClient

// Updated User interface to match backend User model (excluding password_hash)
interface User {
  _id: string; // Changed from id to _id
  first_name: string; // Added
  last_name: string; // Added
  email: string;
  is_email_verified?: boolean; // New field
  profile_picture?: string;
  account_type?: string;
  auth_provider?: string;
  created_at: string; // Dates will likely be strings from JSON
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (details: { first_name: string; last_name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  // Removed checkSession, will use loadUserFromToken
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until user state is determined
  const router = useRouter();
  const pathname = usePathname();

  const loadUserFromToken = useCallback(async () => {
    setIsLoading(true);
    console.log('[AuthContext] Attempting to load user from /auth/me...');
    try {
      const response = await apiClient.get('/auth/me');
      console.log(`[AuthContext] /auth/me response status: ${response.status}`);
      if (response.data && response.data.success && response.data.data) {
        setUser(response.data.data as User);
        console.log('[AuthContext] User loaded successfully from token:', response.data.data);
      } else {
        setUser(null);
        console.warn('[AuthContext] /auth/me call did not return user data or was not successful.');
      }
    } catch (error: any) {
      setUser(null);
      if (error.response && error.response.status === 401) {
        console.log('[AuthContext] No valid session found (401 from /auth/me).');
      } else {
        console.error('[AuthContext] Error loading user from token:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', credentials);
      if (response.data && response.data.success && response.data.data.user) {
        const loggedInUser = response.data.data.user as User;
        setUser(loggedInUser);
        toast({ title: "Login Successful", description: `Welcome back, ${loggedInUser.first_name}!` });
        router.push(pathname.startsWith('/dashboard') ? pathname : '/dashboard');
      } else {
        throw new Error(response.data?.message || 'Login failed due to unexpected server response');
      }
    } catch (error: any) {
      console.error('Login failed in AuthContext:', error);
      setUser(null);
      let errorMessage = "An unexpected error occurred during login.";
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || error.response.data.error?.message || error.message;
      } else {
        errorMessage = error.message;
      }
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (details: { first_name: string; last_name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/signup', details);
      if (response.data && response.data.success && response.data.data.user) {
        const signedUpUser = response.data.data.user as User;
        // Don't auto-login until email is verified, we will change this later
        // setUser(signedUpUser); 
        toast({
          title: "Signup Successful",
          // description: `Welcome, ${signedUpUser.first_name}! You are now logged in.`,
          description: `Welcome, ${signedUpUser.first_name}! Please check your email to verify your account.`,
        });
        // router.push('/dashboard'); // Don't redirect yet
        // Potentially redirect to a page that says "Please verify your email"
        router.push('/login?message=verify-email');
      } else {
        throw new Error(response.data?.message || 'Signup failed due to unexpected response');
      }
    } catch (error: any) {
      console.error('Signup failed in AuthContext:', error);
      setUser(null); 
      let errorMessage = "An unexpected error occurred during signup.";
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || error.response.data.error?.message || error.message;
      } else {
        errorMessage = error.message;
      }
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    // The backend handles the cookie setting and redirect.
    // The frontend just needs to navigate to the Google auth endpoint.
    const googleAuthUrl = `${apiClient.defaults.baseURL}/auth/google`;
    window.location.href = googleAuthUrl;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout');
      // Cookie is cleared by the backend.
    } catch (error: any) {
      console.error('Logout request failed on backend:', error.response?.data?.message || error.message);
      // Even if backend call fails, proceed with frontend logout
    } finally {
      setUser(null);
      setIsLoading(false);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAuthenticated: !!user, // Determine by user presence
        isLoading, 
        login, 
        signup, 
        logout, 
        loginWithGoogle 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
