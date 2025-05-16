import apiClient from './apiClient';

// List of chart types to exclude completely
const EXCLUDED_CHART_TYPES = ['map', 'geo', 'world', 'bmap', 'mapbox', 'heatmap'];

interface VisualizationRecommendationsResponse {
  recommendationCacheId: string;
  source_info: any;
  dataset_info: any;
  analysis_summary: string;
  recommended_visualizations: VisualizationRecommendation[];
}

interface VisualizationRecommendation {
  id: string;
  title: string;
  description: string;
  type: string;
  suggestedDimensions: string[];
  echartsConfigHints: any;
  preview: any;
}

interface RefinedVisualizationsResponse {
  recommendationCacheId: string;
  refinement_summary: string;
  refined_visualizations: VisualizationRecommendation[];
}

interface GeneratedVisualizationsResponse {
  collection: string;
  generatedVisualizations: GeneratedVisualization[];
}

interface GeneratedVisualization {
  id: string;
  title: string;
  type: string;
  options: any;
  error: any | null;
}

interface Dashboard {
  _id: string;
  name: string;
  description: string;
  collectionName: string;
  visualizations: GeneratedVisualization[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter visualizations to remove map types
 */
function filterVisualizationTypes(visualizations: VisualizationRecommendation[]): VisualizationRecommendation[] {
  if (!visualizations || !Array.isArray(visualizations)) return [];
  
  return visualizations.filter(vis => {
    // Skip visualizations with excluded types
    if (!vis.type) return true;
    const lowercaseType = vis.type.toLowerCase();
    return !EXCLUDED_CHART_TYPES.some(excludedType => lowercaseType.includes(excludedType));
  });
}

// Service for interacting with visualization API endpoints
const visualizationService = {
  /**
   * Get visualization recommendations for a collection
   */
  getRecommendations: async (collectionName: string, sampleSize = 100): Promise<VisualizationRecommendationsResponse> => {
    try {
      const response = await apiClient.post('/visualizations/recommend', {
        collectionName,
        sampleSize
      });
      
      // Filter out map visualizations from recommendations
      const data = response.data.data;
      data.recommended_visualizations = filterVisualizationTypes(data.recommended_visualizations);
      
      return data;
    } catch (error) {
      console.error('Error getting visualization recommendations:', error);
      throw error;
    }
  },
  
  /**
   * Refine visualization recommendations with natural language
   */
  refineRecommendations: async (
    recommendationCacheId: string, 
    userPrompt: string,
    currentRecommendations?: any[]
  ): Promise<RefinedVisualizationsResponse> => {
    try {
      // Add explicit instruction to avoid map visualizations
      const enhancedPrompt = `${userPrompt}. Important: Do not include any map visualizations.`;
      
      const response = await apiClient.post('/visualizations/refine-recommendations', {
        recommendationCacheId,
        userPrompt: enhancedPrompt,
        currentRecommendations
      });
      
      // Filter out map visualizations from the refined recommendations
      const data = response.data.data;
      data.refined_visualizations = filterVisualizationTypes(data.refined_visualizations);
      
      return data;
    } catch (error) {
      console.error('Error refining recommendations:', error);
      throw error;
    }
  },
  
  /**
   * Generate visualizations from selected recommendations
   */
  generateVisualizations: async (
    recommendationCacheId: string, 
    selectedRecommendationIds: string[]
  ): Promise<GeneratedVisualizationsResponse> => {
    try {
      const response = await apiClient.post('/visualizations/generate', {
        recommendationCacheId,
        selectedRecommendationIds
      });
      
      // Filter map types if any made it through
      const data = response.data.data;
      if (data.generatedVisualizations && Array.isArray(data.generatedVisualizations)) {
        data.generatedVisualizations = data.generatedVisualizations.map(viz => {
          if (viz.type && EXCLUDED_CHART_TYPES.some(type => viz.type.toLowerCase().includes(type))) {
            viz.type = 'bar'; // Convert map types to bar chart
          }
          return viz;
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error generating visualizations:', error);
      throw error;
    }
  },
  
  /**
   * Save a dashboard of visualizations
   */
  saveDashboard: async (
    name: string, 
    description: string, 
    collectionName: string, 
    visualizations: GeneratedVisualization[]
  ): Promise<{ dashboardId: string; name: string; message: string }> => {
    try {
      // Filter out map visualization types if they exist
      const filteredVisualizations = visualizations.map(viz => {
        if (viz.type && EXCLUDED_CHART_TYPES.some(type => viz.type.toLowerCase().includes(type))) {
          viz.type = 'bar'; // Convert map types to bar chart
        }
        return viz;
      });
      
      const response = await apiClient.post('/visualizations/dashboards', {
        name,
        description,
        collectionName,
        visualizations: filteredVisualizations
      });
      return response.data.data;
    } catch (error) {
      console.error('Error saving dashboard:', error);
      throw error;
    }
  },
  
  /**
   * Get all dashboards
   */
  getAllDashboards: async (): Promise<Dashboard[]> => {
    try {
      const response = await apiClient.get('/visualizations/dashboards');
      return response.data.data.dashboards;
    } catch (error) {
      console.error('Error getting dashboards:', error);
      throw error;
    }
  },
  
  /**
   * Get a dashboard by ID
   */
  getDashboardById: async (dashboardId: string): Promise<Dashboard> => {
    try {
      const response = await apiClient.get(`/visualizations/dashboards/${dashboardId}`);
      return response.data.data.dashboard;
    } catch (error) {
      console.error('Error getting dashboard:', error);
      throw error;
    }
  },
  
  /**
   * Get available collections for visualization
   */
  getCollections: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/datasources/collections');
      return response.data.data;
    } catch (error) {
      console.error('Error getting collections:', error);
      throw error;
    }
  }
};

export default visualizationService;
export type { 
  VisualizationRecommendation, 
  GeneratedVisualization, 
  Dashboard 
}; 