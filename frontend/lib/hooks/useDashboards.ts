import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  lastUpdated?: string;
  charts?: any[];
  type?: 'bar' | 'pie' | 'line' | 'mixed';
}

export function useDashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboards() {
      try {
        setLoading(true);
        const response = await apiClient.get('/dashboards');
        
        if (response.data && response.data.data) {
          // Backend returns dashboards in data property
          const dashboardsData = Array.isArray(response.data.data) ? response.data.data : [];
          
          // Map the dashboards to our expected format
          const formattedDashboards = dashboardsData.map((dashboard: any) => {
            // Extract visualizations as charts
            const charts = dashboard.visualizations || [];
            
            // Determine dashboard type based on visualizations
            let dashboardType: 'bar' | 'pie' | 'line' | 'mixed' = 'mixed';
            if (charts.length > 0) {
              const chartTypes = charts.map((chart: any) => chart.type).filter(Boolean);
              const uniqueTypes = [...new Set(chartTypes)];
              if (uniqueTypes.length === 1) {
                dashboardType = uniqueTypes[0] as any;
              }
            }
            
            return {
              id: dashboard._id,
              title: dashboard.name,
              description: dashboard.description || '',
              lastUpdated: dashboard.updatedAt || dashboard.createdAt,
              charts: charts,
              type: dashboardType
            };
          });
          
          setDashboards(formattedDashboards);
        } else {
          // Handle unexpected response format
          console.warn('Unexpected API response format:', response.data);
          setDashboards([]);
        }
        setError(null);
      } catch (err: any) {
        console.error('Error fetching dashboards:', err);
        setError(err.message || 'Failed to fetch dashboards');
        setDashboards([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboards();
  }, []);

  return { dashboards, loading, error };
} 