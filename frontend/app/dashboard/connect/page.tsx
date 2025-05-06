"use client";

import React, { useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { ConnectHeader } from "@/components/connect/connect-header";
import { ConnectTabs } from "@/components/connect/connect-tabs";
import { RecentConnections } from "@/components/connect/recent-connections";

interface FileInfo {
  fileId: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
}

export default function ConnectDataPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = useCallback((fileInfo: FileInfo) => {
    console.log("File uploaded, triggering refresh:", fileInfo);
    setRefreshKey((prevKey) => prevKey + 1);
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ConnectHeader />
      <ConnectTabs onUploadSuccess={handleUploadSuccess} />
      <div className="mt-6">
        <RecentConnections key={refreshKey} />
      </div>
    </div>
  );
}
