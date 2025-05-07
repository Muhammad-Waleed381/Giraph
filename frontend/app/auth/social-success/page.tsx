"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function SocialSuccessPage() {
  const { checkSession, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finalizing your sign-in, please wait...");

  useEffect(() => {
    // Check for errors passed from the backend redirect
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = "Google sign-in failed. Please try again.";
      if (error === 'google_auth_failed') {
        errorMessage = "Authentication with Google failed. No user data received.";
      } else if (error === 'google_auth_processing_failed') {
        errorMessage = "Failed to process Google authentication on our server.";
      }
      toast({ title: "Sign-in Error", description: errorMessage, variant: "destructive" });
      router.replace('/login');
      return;
    }

    // If no error in query params, proceed to check session
    // This assumes the backend has set the HttpOnly cookie
    checkSession().finally(() => {
      // The checkSession will update the user state in AuthContext
      // We don't need to wait for its direct return value here if it updates context
    });
  }, [checkSession, router, searchParams]);

  useEffect(() => {
    // This effect runs when authLoading changes or user state is updated
    if (!authLoading) {
      if (user) {
        toast({ title: "Sign-in Successful", description: "Welcome!" });
        router.replace('/dashboard');
      } else {
        // If after checkSession, user is still null and no query error, it implies cookie wasn't set or session is invalid
        // This case might have been caught by the query param error check if backend redirected with error
        // If not, it's a more subtle failure.
        const error = searchParams.get('error'); // Re-check error, as initial state might not have it
        if (!error) { // Only show this generic error if no specific error was passed in URL
            toast({ title: "Sign-in Failed", description: "Could not establish session. Please try logging in again.", variant: "destructive" });
        }
        router.replace('/login');
      }
    }
  }, [user, authLoading, router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="rounded-lg bg-card p-8 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg font-semibold text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">You will be redirected shortly.</p>
        </div>
      </div>
    </div>
  );
}
