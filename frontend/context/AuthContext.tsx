"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  // Add other relevant user fields
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  signup: (details: any) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until session is checked
  const router = useRouter();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'; // Ensure this env var is set or default

  // Function to check the current session
  const checkSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/session`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
        // Don't redirect here, let protected routes handle it
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      // Optionally show a toast for network errors
      // toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Check session on initial load
  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Login function
  const login = async (credentials: any) => {
    setIsLoading(true);
    let response: Response | undefined; // Define response here to access in catch
    try {
      response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', // Prefer JSON responses
         },
        body: JSON.stringify(credentials),
      });

      const contentType = response.headers.get("content-type");
      let data;

      // Check if the response is JSON before parsing
      if (contentType && contentType.includes("application/json")) {
        data = await response.json(); // Parse JSON data
      } else {
        // If not JSON, read as text and throw an error
        const responseText = await response.text();
        console.error('Non-JSON response received from login API:', responseText);
        throw new Error(response.statusText || 'Server returned an unexpected response.');
      }

      if (response.ok) {
        setUser(data.user);
        toast({ title: "Login Successful", description: "Welcome back!" });
        router.push('/dashboard'); // Redirect to dashboard on successful login
      } else {
        // Use message from JSON if available, otherwise use status text
        throw new Error(data.message || response.statusText || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setUser(null);

      let errorMessage = "An unexpected error occurred during login.";
      // Provide more specific feedback for JSON parsing errors vs other errors
      if (error instanceof SyntaxError) { // JSON parse error (should be less likely now)
          errorMessage = "Received an invalid response format from the server.";
      } else if (error.message) {
          errorMessage = error.message;
      }

      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
      throw error; // Re-throw error to be caught in the form
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (details: any) => {
    setIsLoading(true);
    let response: Response | undefined;
    try {
      response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json', // Prefer JSON
        },
        body: JSON.stringify(details),
      });

      const contentType = response.headers.get("content-type");
      let data;

      // Check if the response is JSON before parsing
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // If not JSON, read as text and throw an error
        const responseText = await response.text();
        console.error('Non-JSON response received from signup API:', responseText);
        // Use status text if available, otherwise a generic message
        throw new Error(response.statusText || 'Server returned an unexpected response during signup.');
      }

      if (response.ok) {
        // Assuming successful signup returns user data or a success message in JSON
        toast({ title: "Signup Successful", description: data.message || "Please log in to continue." });
        router.push('/login'); // Redirect to login page after successful signup
      } else {
        // Use message from JSON if available, otherwise use status text
        throw new Error(data.message || response.statusText || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup failed:', error);

      let errorMessage = "An unexpected error occurred during signup.";
      if (error instanceof SyntaxError) { // JSON parse error
          errorMessage = "Received an invalid response format from the server.";
      } else if (error.message) {
          errorMessage = error.message;
      }

      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
      throw error; // Re-throw error to be caught in the form
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
         // Even if logout fails on backend, clear frontend state
         console.error('Backend logout failed, proceeding with frontend logout.');
      }

    } catch (error) {
      console.error('Logout request failed:', error);
       // Still proceed with frontend logout on network error
    } finally {
       setUser(null);
       setIsLoading(false);
       toast({ title: "Logged Out", description: "You have been successfully logged out." });
       router.push('/login'); // Redirect to login page after logout
    }
  };


  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
