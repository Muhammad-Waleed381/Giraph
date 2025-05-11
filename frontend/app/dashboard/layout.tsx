"use client"; // This layout is a Client Component because it uses hooks

import type React from "react"
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[DashboardLayout] User not authenticated, redirecting to login.');
      // Store the intended path to redirect back after login
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    console.log('[DashboardLayout] Auth state loading, showing loader.');
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback, show loader or null to prevent rendering children.
    console.log('[DashboardLayout] Still not authenticated after load, showing loader (should have redirected).');
    return <FullPageLoader />;
  }
  
  // If authenticated and not loading, render the dashboard sidebar and children
  console.log('[DashboardLayout] User authenticated, rendering dashboard content for:', user?.email);
  return <DashboardSidebar>{children}</DashboardSidebar>
}
