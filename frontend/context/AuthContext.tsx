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
  signup: (details: { name: string; email: string; password: string }) => Promise<void>; // Updated details type
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
    console.log('[AuthContext] Attempting to check session at /auth/status...'); // Log: Start session check
    try {
      const response = await fetch(`${apiBaseUrl}/auth/status`, { // Changed to /auth/status
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies with the request
      });

      console.log(`[AuthContext] Session check response status from /auth/status: ${response.status}`); // Log: Response status

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] Session check successful from /auth/status, user data:', data.user); // Log: Success and user data
        setUser(data.user); // Make sure data.user is the correct path to user object
      } else {
        let errorResponseText = 'Failed to get error response text';
        try {
            errorResponseText = await response.text();
        } catch (e) {
            console.error('[AuthContext] Could not read error response body text from /auth/status:', e);
        }
        console.warn(`[AuthContext] Session check failed from /auth/status. Status: ${response.status}, Response Body: ${errorResponseText}`); // Log: Failure status and body
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Error during session check fetch operation to /auth/status:', error); // Log: Fetch operation error
      setUser(null);
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
  const signup = async (details: { name: string; email: string; password: string }) => { // Updated details type
    setIsLoading(true);
    let response: Response | undefined;
    try {
      // Ensure the backend expects 'username' and not 'name'
      const signupDetails = {
        username: details.name, // Map frontend 'name' to backend 'username'
        email: details.email,
        password: details.password,
      };

      response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
        },
        body: JSON.stringify(signupDetails), // Use mapped details
      });

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const responseText = await response.text();
        console.error('Non-JSON response received from signup API:', responseText);
        throw new Error(response.statusText || 'Server returned an unexpected response during signup.');
      }

      if (response.ok) {
        // Backend successfully created user and sent verification email
        toast({
          title: "Signup Successful",
          description: data.message || "Account created. Please check your email to verify your account before logging in.",
        });
        router.push('/login'); // Redirect to login page
      } else {
        // Use message from JSON if available, otherwise use status text
        throw new Error(data.message || response.statusText || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup failed:', error);

      let errorMessage = "An unexpected error occurred during signup.";
      if (error instanceof SyntaxError) {
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
        credentials: 'include', // Send cookies with the request (e.g., for backend to clear HttpOnly cookie)
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
