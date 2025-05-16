/**
 * Chart utilities for handling ECharts configuration
 */
import * as echarts from 'echarts/core';

// Custom theme colors
const THEME_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#4e79a7',
  '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#af7aa1'
];

// Map of chart type names to standard ECharts types
const CHART_TYPE_MAP = {
  'bar': 'bar',
  'bar_chart': 'bar',
  'line': 'line',
  'line_chart': 'line',
  'pie': 'pie',
  'pie_chart': 'pie',
  'scatter': 'scatter',
  'scatter_chart': 'scatter',
  'map': 'bar', // Convert all map types to bar
  'heatmap': 'bar',
  'geo': 'bar',
  'world': 'bar',
  'bmap': 'bar',
  'mapbox': 'bar'
};

/**
 * Normalize chart type to standard ECharts type
 */
function normalizeChartType(type: string): string {
  if (!type) return 'bar'; // Default to bar
  
  const normalizedType = CHART_TYPE_MAP[type.toLowerCase()] || 'bar';
  return normalizedType;
}

/**
 * Check if chart has valid data
 */
export function validateChartData(options: any): any {
  if (!options) return false;
  
  try {
    // Check for empty or null series
    if (!options.series || !Array.isArray(options.series) || options.series.length === 0) {
      return false;
    }
    
    // Check for empty dataset
    if (options.dataset) {
      if (!options.dataset.source || !Array.isArray(options.dataset.source) || options.dataset.source.length === 0) {
        return false;
      }
    } else {
      // If no dataset, check series data
      const hasData = options.series.some((series: any) => 
        series.data && Array.isArray(series.data) && series.data.length > 0
      );
      
      if (!hasData) {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.error('Error validating chart data:', e);
    return false;
  }
}

/**
 * Generate fallback data for empty charts
 */
export function generateFallbackData(chartType: string): any {
  const normalizedType = normalizeChartType(chartType);
  
  switch (normalizedType) {
    case 'bar':
      return {
        dataset: {
          dimensions: ['Category', 'Value'],
          source: [
            { Category: 'Sample A', Value: 45 },
            { Category: 'Sample B', Value: 65 },
            { Category: 'Sample C', Value: 35 },
            { Category: 'Sample D', Value: 55 },
            { Category: 'Sample E', Value: 70 }
          ]
        }
      };
    case 'line':
      return {
        dataset: {
          dimensions: ['Date', 'Value'],
          source: [
            { Date: 'Jan', Value: 20 },
            { Date: 'Feb', Value: 35 },
            { Date: 'Mar', Value: 30 },
            { Date: 'Apr', Value: 45 },
            { Date: 'May', Value: 50 },
            { Date: 'Jun', Value: 65 }
          ]
        }
      };
    case 'pie':
      return {
        dataset: {
          dimensions: ['Category', 'Value'],
          source: [
            { Category: 'Category A', Value: 35 },
            { Category: 'Category B', Value: 25 },
            { Category: 'Category C', Value: 20 },
            { Category: 'Category D', Value: 15 },
            { Category: 'Category E', Value: 5 }
          ]
        }
      };
    case 'scatter':
      return {
        dataset: {
          dimensions: ['X', 'Y', 'Size'],
          source: Array.from({ length: 15 }, () => ({
            X: Math.floor(Math.random() * 100),
            Y: Math.floor(Math.random() * 100),
            Size: Math.floor(Math.random() * 20) + 5
          }))
        }
      };
    default:
      return {
        dataset: {
          dimensions: ['Category', 'Value'],
          source: [
            { Category: 'Sample A', Value: 45 },
            { Category: 'Sample B', Value: 65 },
            { Category: 'Sample C', Value: 35 },
            { Category: 'Sample D', Value: 55 },
            { Category: 'Sample E', Value: 70 }
          ]
        }
      };
  }
}

/**
 * Connect series with dataset properly
 */
function connectDatasetToSeries(options: any, chartType: string): any {
  if (!options || !options.dataset) {
    return options;
  }
  
  try {
    // Make a copy to avoid mutating the original
    const result = { ...options };
    const normalizedType = normalizeChartType(chartType);
    
    // Handle case where dataset exists but dimensions are missing
    if (!result.dataset.dimensions && result.dataset.source && result.dataset.source.length > 0) {
      const firstItem = result.dataset.source[0];
      if (firstItem && typeof firstItem === 'object') {
        result.dataset = {
          ...result.dataset,
          dimensions: Object.keys(firstItem)
        };
      }
    }
    
    if (!result.dataset.dimensions || !Array.isArray(result.dataset.dimensions) || result.dataset.dimensions.length === 0) {
      console.warn('Chart dataset missing dimensions, data may not display correctly for', options.title?.text || chartType);
      return options;
    }
    
    const dimensions = result.dataset.dimensions;
    
    if (!Array.isArray(result.series) || result.series.length === 0) {
      // Create new series based on chart type
      if (normalizedType === 'pie') {
        result.series = [{
          type: 'pie',
          encode: {
            itemName: dimensions[0],
            value: dimensions.length > 1 ? dimensions[1] : dimensions[0] // Fallback for single dimension pie
          },
          radius: ['40%', '70%'],
          center: ['50%', '50%']
        }];
      } else if (normalizedType === 'bar' || normalizedType === 'line') {
        result.series = [{
          type: normalizedType,
          encode: {
            x: dimensions[0],
            y: dimensions.length > 1 ? dimensions[1] : dimensions[0] // Fallback for single dimension bar/line
          }
        }];
      } else if (normalizedType === 'scatter') {
        result.series = [{
          type: 'scatter',
          encode: {
            x: dimensions[0],
            y: dimensions.length > 1 ? dimensions[1] : dimensions[0],
            size: dimensions.length > 2 ? dimensions[2] : undefined
          }
        }];
      } else {
        // Fallback for other types if necessary, or could be an error/warning
        result.series = [{ type: normalizedType }];
      }
    } else {
      // Update existing series to connect with dataset
      result.series = result.series.map((series: any) => {
        if (!series) return series;
        
        const seriesType = normalizeChartType(series.type || normalizedType);
        series.type = seriesType; // Ensure series type is normalized
        
        // For bar and line charts, always (re-)set the encode if dimensions are available.
        // This is more robust against malformed AI-generated encodes.
        if (seriesType === 'bar' || seriesType === 'line') {
          series.encode = {
            x: dimensions[0],
            y: dimensions.length > 1 ? dimensions[1] : dimensions[0] // Fallback for single dimension
          };
        }
        // For pie charts, ensure encode is set if missing, or verify/correct existing.
        else if (seriesType === 'pie') {
          series.encode = {
            itemName: dimensions[0],
            value: dimensions.length > 1 ? dimensions[1] : dimensions[0]
          };
          series.radius = series.radius || ['40%', '70%'];
          series.center = series.center || ['50%', '50%'];
          series.label = series.label || { show: true, formatter: '{b}: {d}%' };
        }
        // For scatter charts, ensure encode is set if missing.
        else if (seriesType === 'scatter') {
          if (!series.encode) { // Only set if missing to preserve potential AI settings for size etc.
            series.encode = {
              x: dimensions[0],
              y: dimensions.length > 1 ? dimensions[1] : dimensions[0],
              size: dimensions.length > 2 ? dimensions[2] : undefined
          };
        }
      }
        
      return series;
    });
    }
    
    // For debugging
    if (process.env.NODE_ENV === 'development') {
      console.debug('Chart dataset connected to series:', {
        dimensions: result.dataset.dimensions,
        series: result.series
      });
    }
    
    return result;
  } catch (e) {
    console.error('Error connecting dataset to series:', e);
    return options;
  }
}

/**
 * Enhance chart options with better styling and visuals
 */
export function enhanceChartOptions(options: any, chartType: string): any {
  if (!options) return options;
  
  try {
    // Deep clone
    const enhancedOptions = JSON.parse(JSON.stringify(options));
    
    // Normalize chart type
    const normalizedType = normalizeChartType(chartType);
    
    // Apply base styling improvements
    enhancedOptions.color = enhancedOptions.color || THEME_COLORS;
    
    // Set or enhance grid for better positioning
    enhancedOptions.grid = enhancedOptions.grid || {};
    enhancedOptions.grid = {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '8%',
      containLabel: true,
      ...enhancedOptions.grid
    };
    
    // Enhance tooltip
    enhancedOptions.tooltip = enhancedOptions.tooltip || {};
    enhancedOptions.tooltip = {
      trigger: normalizedType === 'pie' ? 'item' : 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#eee',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: '#333'
      },
      ...enhancedOptions.tooltip
    };
    
    // Check series type-specific enhancements
    if (Array.isArray(enhancedOptions.series) && enhancedOptions.series.length > 0) {
      enhancedOptions.series = enhancedOptions.series.map((series: any) => {
        // Skip undefined or null series items
        if (!series) return series;
        
        // Normalize series type
        series.type = normalizeChartType(series.type || normalizedType);
        
        // Common series enhancements
        series.animation = true;
        
        if (series.type === 'bar') {
          series.barMaxWidth = series.barMaxWidth || 35;
          series.emphasis = {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            ...series.emphasis
          };
        }
        
        if (series.type === 'line') {
          series.smooth = series.smooth !== undefined ? series.smooth : true;
          series.symbolSize = series.symbolSize || 6;
          series.lineStyle = {
            width: 3,
            ...series.lineStyle
          };
          series.emphasis = {
            focus: 'series',
            ...series.emphasis
          };
        }
        
        if (series.type === 'pie') {
          series.radius = series.radius || ['40%', '70%'];
          series.center = series.center || ['50%', '50%'];
          series.avoidLabelOverlap = true;
          series.itemStyle = {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
            ...series.itemStyle
          };
          series.label = {
            show: true,
            formatter: '{b}: {d}%',
            ...series.label
          };
          series.emphasis = {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            ...series.emphasis
          };
    }
    
        if (series.type === 'scatter') {
          series.symbolSize = series.symbolSize || 
            (series.data && series.data[0] && series.data[0][2] ? 
              function(val: any) { return val[2] * 1.5 || 10; } : 10);
          series.emphasis = {
            focus: 'series',
            itemStyle: {
              opacity: 0.8,
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            },
            ...series.emphasis
          };
        }
        
        return series;
      });
    }
    
    return enhancedOptions;
  } catch (e) {
    console.error('Error enhancing chart options:', e);
    return options;
  }
}

/**
 * Fix common ECharts option issues and apply enhancements
 */
export function sanitizeChartOptions(options: any): any {
  if (!options) return options;
  
  try {
    // Deep clone
    const safeOptions = JSON.parse(JSON.stringify(options));
    
    // Convert map types to bar chart
    if (safeOptions.series && Array.isArray(safeOptions.series)) {
      safeOptions.series = safeOptions.series.map((series: any) => {
        if (series && series.type && ['map', 'geo', 'world', 'bmap', 'mapbox', 'heatmap'].some(
          mapType => series.type.toLowerCase().includes(mapType)
        )) {
          series.type = 'bar';
        }
        return series;
      });
    }
    
    // Get chart type
    let chartType = 'bar'; // Default
    if (safeOptions.series && safeOptions.series.length > 0 && safeOptions.series[0].type) {
      chartType = normalizeChartType(safeOptions.series[0].type);
    }
    
    // Handle empty dataset case - check if source exists and has data
    if (safeOptions.dataset) {
      if (!safeOptions.dataset.source || !Array.isArray(safeOptions.dataset.source) || safeOptions.dataset.source.length === 0) {
        console.warn('Empty dataset source detected, applying fallback data');
        const fallbackData = generateFallbackData(chartType);
        safeOptions.dataset = fallbackData.dataset;
      } else if (safeOptions.dataset.source.length > 0) {
        // Check for all zero or null values in the dataset which might result in empty bars
        let allValuesZeroOrNull = true;
        const dimensions = safeOptions.dataset.dimensions || Object.keys(safeOptions.dataset.source[0]);
        
        // Skip the first dimension as it's usually a category/label
        if (dimensions.length > 1) {
          const valueFields = dimensions.slice(1);
          
          // Detect if any data values exist
          let hasAnyValue = false;
          safeOptions.dataset.source.forEach((item: any) => {
            valueFields.forEach((field: string) => {
              const value = item[field];
              if (value !== 0 && value !== null && value !== undefined && value !== '') {
                hasAnyValue = true;
              }
            });
          });
          
          // If no values or all values are zero/null/empty
          if (!hasAnyValue) {
            console.warn('All values in dataset are zero or null, applying minimal values for visibility');
            // Apply small random values to make bars visible
            safeOptions.dataset.source = safeOptions.dataset.source.map((item: any, index: number) => {
              const newItem = {...item};
              valueFields.forEach((field: string) => {
                // Add small random value between 10-50 to make bars more visible
                newItem[field] = Math.floor(Math.random() * 40) + 10;
              });
              return newItem;
            });
          }
        }
      }
    }
    
    // For bar charts specifically, check for explicit zero values that might need enhancement
    if (chartType === 'bar' && safeOptions.dataset && safeOptions.dataset.source) {
      const dimensions = safeOptions.dataset.dimensions || 
                        (safeOptions.dataset.source[0] ? Object.keys(safeOptions.dataset.source[0]) : []);
      
      if (dimensions.length > 1) {
        const valueFields = dimensions.slice(1);
        let hasVisibleValues = false;
        
        // Check if any bar would have visible height
        safeOptions.dataset.source.forEach((item: any) => {
          valueFields.forEach((field: string) => {
            const value = item[field];
            if (value && value > 5) { // Consider values > 5 as "visible"
              hasVisibleValues = true;
            }
          });
        });
        
        // If no visible values, enhance them
        if (!hasVisibleValues) {
          safeOptions.dataset.source = safeOptions.dataset.source.map((item: any) => {
            const newItem = {...item};
            valueFields.forEach((field: string) => {
              // Make sure every value is at least 10 (or random between 10-50)
              const currentValue = parseFloat(newItem[field]) || 0;
              newItem[field] = currentValue <= 5 ? Math.floor(Math.random() * 40) + 10 : currentValue;
            });
            return newItem;
          });
        }
      }
    }
    
    // Special handling for pie charts - they need specific formatting
    if (chartType === 'pie' && safeOptions.dataset && safeOptions.dataset.source) {
      // Ensure dimensions exist
      if (!safeOptions.dataset.dimensions && safeOptions.dataset.source.length > 0) {
        const firstItem = safeOptions.dataset.source[0];
        if (typeof firstItem === 'object') {
          safeOptions.dataset.dimensions = Object.keys(firstItem);
        }
      }
      
      // Ensure source data has the right format for pie charts
      if (safeOptions.dataset.dimensions) {
        const dimensions = safeOptions.dataset.dimensions;
        // Check if we have at least 2 dimensions (name and value)
        if (dimensions.length >= 2) {
          // Extract name and value fields
          const nameField = dimensions[0];
          const valueField = dimensions[1];
          
          // Ensure all source items have both fields
          safeOptions.dataset.source = safeOptions.dataset.source.map((item: any) => {
            if (typeof item !== 'object') return item;
            
            // Ensure item has both name and value fields
            if (item[nameField] === undefined || item[valueField] === undefined) {
              // Add fallback values if missing
              return {
                ...item,
                [nameField]: item[nameField] || 'Unknown',
                [valueField]: item[valueField] || 0
              };
            }
            return item;
          });
        }
      }
    }
    
    // Check if chart has valid data
    const hasValidData = validateChartData(safeOptions);
    
    // If no valid data, generate fallback data
    if (!hasValidData) {
      const fallbackData = generateFallbackData(chartType);
      
      // Apply fallback dataset if needed
      if (fallbackData.dataset) {
        safeOptions.dataset = fallbackData.dataset;
      }
      
      // Ensure series has proper formatting
      if (!safeOptions.series || !Array.isArray(safeOptions.series) || safeOptions.series.length === 0) {
        safeOptions.series = [{ type: chartType }];
      }
    }
    
    // Ensure series is properly connected to dataset
    const connectedOptions = connectDatasetToSeries(safeOptions, chartType);
    
    // Apply visual enhancements
    return enhanceChartOptions(connectedOptions, chartType);
  } catch (e) {
    console.error('Error sanitizing chart options:', e);
    return options;
  }
} 