"use client";

import type React from "react"
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { FullPageLoader } from "@/components/ui/full-page-loader"

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[ConnectLayout] User not authenticated, redirecting to login.');
      // Store the intended path to redirect back after login
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <FullPageLoader />;
  }
  
  return <DashboardSidebar>{children}</DashboardSidebar>
} 