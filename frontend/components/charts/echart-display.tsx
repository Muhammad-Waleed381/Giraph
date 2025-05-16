"use client"

import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { sanitizeChartOptions } from '@/lib/chartUtils';
import { useTheme } from 'next-themes';

// Define elegant theme presets
const lightTheme = {
  backgroundColor: '#ffffff',
  textStyle: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#333333',
  },
  title: {
    textStyle: {
      fontWeight: 500,
      color: '#333333',
      fontSize: 16,
    },
    subtextStyle: {
      color: '#999999',
    },
  },
  grid: {
    borderColor: '#f5f5f5',
    containLabel: true,
  },
  legend: {
    textStyle: {
      color: '#666666',
    },
    pageIconColor: '#999999',
    pageTextStyle: {
      color: '#666666',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e6e6e6',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: {
      color: '#333333',
    },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 4px;',
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#eeeeee',
      },
    },
    splitLine: {
      lineStyle: {
        color: '#f5f5f5',
      },
    },
    axisLabel: {
      color: '#666666',
    },
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#eeeeee',
      },
    },
    splitLine: {
      lineStyle: {
        color: '#f5f5f5',
      },
    },
    axisLabel: {
      color: '#666666',
    },
  },
};

const darkTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#e0e0e0',
  },
  title: {
    textStyle: {
      fontWeight: 500,
      color: '#e0e0e0',
      fontSize: 16,
    },
    subtextStyle: {
      color: '#999999',
    },
  },
  grid: {
    borderColor: '#333333',
    containLabel: true,
  },
  legend: {
    textStyle: {
      color: '#cccccc',
    },
    pageIconColor: '#999999',
    pageTextStyle: {
      color: '#cccccc',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(50, 50, 50, 0.95)',
    borderColor: '#444444',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: {
      color: '#e0e0e0',
    },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-radius: 4px;',
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#444444',
      },
    },
    splitLine: {
      lineStyle: {
        color: '#333333',
      },
    },
    axisLabel: {
      color: '#cccccc',
    },
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#444444',
      },
    },
    splitLine: {
      lineStyle: {
        color: '#333333',
      },
    },
    axisLabel: {
      color: '#cccccc',
    },
  },
};

// Define series types with proper typing for encoding
interface PieSeriesOption {
  type: 'pie';
  radius?: string | number | (string | number)[];
  itemStyle?: any;
  label?: any;
  encode?: {
    itemName?: string;
    value?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface AxisSeriesOption {
  type: 'bar' | 'line' | 'scatter';
  emphasis?: any;
  barMaxWidth?: number;
  smooth?: boolean;
  symbolSize?: number;
  encode?: {
    x?: string;
    y?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

type SeriesOption = PieSeriesOption | AxisSeriesOption;

// Default options by chart type
const defaultChartOptions = {
  bar: {
    emphasis: {
      focus: 'series',
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    },
    barMaxWidth: 50
  },
  line: {
    smooth: true,
    symbolSize: 7,
    emphasis: {
      focus: 'series',
      lineStyle: {
        width: 3
      }
    }
  },
  pie: {
    radius: ['40%', '70%'],
    itemStyle: {
      borderRadius: 4,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      formatter: '{b}: {d}%'
    }
  },
  scatter: {
    symbolSize: 12,
    emphasis: {
      focus: 'series',
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }
};

interface EChartDisplayProps {
  option: any; // ECharts option object
  style?: React.CSSProperties;
  className?: string;
}

export function EChartDisplay({ option, style, className }: EChartDisplayProps) {
  const { resolvedTheme } = useTheme();
  const chartRef = useRef<ReactECharts>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  
  // Only sanitize options once when the component mounts or when option changes
  const safeOption = useMemo(() => {
    if (!option) return null;
    
    try {
      // Validate that option is an object
      if (typeof option !== 'object') {
        console.error('Invalid chart option format:', option);
        setChartError('Invalid chart option format');
        return null;
      }
      
      // Apply sanitization
      const sanitized = sanitizeChartOptions(option);
      setChartError(null); // Clear any previous errors
      return sanitized;
    } catch (e) {
      console.error('Error in chart option sanitization:', e);
      setChartError('Error processing chart options');
      return null;
    }
  }, [option]);
  
  // Create memoized theme-enhanced options to avoid recalculations
  const themedOption = useMemo(() => {
    if (!safeOption) return null;
    
    try {
      // Deep clone the sanitized options
      const optionWithTheme = JSON.parse(JSON.stringify(safeOption));
      
      // Apply theme based on current theme
      const currentTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
      
      // Ensure dataset and series are properly linked
      const hasDataset = optionWithTheme.dataset && 
                        optionWithTheme.dataset.source && 
                        optionWithTheme.dataset.source.length > 0;
                        
      const hasSeries = optionWithTheme.series && 
                        Array.isArray(optionWithTheme.series) && 
                        optionWithTheme.series.length > 0;
      
      // Debug output for chart configuration
      if (process.env.NODE_ENV === 'development') {
        console.debug('Chart configuration:', { 
          hasDataset, 
          hasSeries, 
          datasetSize: hasDataset ? optionWithTheme.dataset.source.length : 0,
          seriesCount: hasSeries ? optionWithTheme.series.length : 0
        });
      }
      
      // Check if we have any data at all
      if (!hasDataset || optionWithTheme.dataset.source.length === 0) {
        setChartError('No data available for chart');
        return null;
      }
      
      // Apply basic series if none provided
      if (!hasSeries && hasDataset) {
        // Determine chart type from any existing series, defaulting to bar
        const chartType = optionWithTheme.series && optionWithTheme.series[0] && optionWithTheme.series[0].type 
          ? optionWithTheme.series[0].type 
          : 'bar';
        
        // Get dimensions for encoding if available
        const dimensions = optionWithTheme.dataset.dimensions || 
          Object.keys(optionWithTheme.dataset.source[0]).filter(k => k !== '_id');
        
        if (chartType === 'pie') {
          // Create pie chart series with proper typing
          const pieSeries: PieSeriesOption = {
            type: 'pie',
            ...(defaultChartOptions.pie || {})
          };
          
          // Add encoding if dimensions are available
          if (dimensions && dimensions.length > 0) {
            pieSeries.encode = dimensions.length >= 2 
              ? { itemName: dimensions[0], value: dimensions[1] } 
              : { itemName: 'category', value: dimensions[0] };
          }
          
          optionWithTheme.series = [pieSeries];
        } else {
          // Create axis-based chart series with proper typing
          const axisSeries: AxisSeriesOption = {
            type: chartType as 'bar' | 'line' | 'scatter',
            ...(defaultChartOptions[chartType as keyof typeof defaultChartOptions] || {})
          };
          
          // Add encoding if dimensions are available
          if (dimensions && dimensions.length > 0) {
            axisSeries.encode = dimensions.length >= 2 
              ? { x: dimensions[0], y: dimensions[1] } 
              : { x: dimensions[0], y: dimensions[0] };
          }
          
          optionWithTheme.series = [axisSeries];
        }
      }
      
      // For bar charts with horizontal orientation, ensure proper axis and grid settings
      const isBarChart = optionWithTheme.series && 
                        optionWithTheme.series[0] && 
                        optionWithTheme.series[0].type === 'bar';
                        
      // Force horizontal bars for better visibility when we have many categories
      if (isBarChart && hasDataset && optionWithTheme.dataset.source.length > 3) {
        // Set horizontal layout for bar charts
        optionWithTheme.yAxis = optionWithTheme.yAxis || {};
        optionWithTheme.yAxis.type = 'category';
        optionWithTheme.yAxis.axisLabel = {
          ...optionWithTheme.yAxis.axisLabel,
          width: 100, // Allocate space for labels
          overflow: 'truncate'
        };
        
        optionWithTheme.xAxis = optionWithTheme.xAxis || {};
        optionWithTheme.xAxis.type = 'value';
        
        // Ensure grid has enough space for labels
        optionWithTheme.grid = optionWithTheme.grid || {};
        optionWithTheme.grid.left = optionWithTheme.grid.left || '15%';
        optionWithTheme.grid.containLabel = true;
        
        // Adjust series for horizontal orientation
        if (optionWithTheme.series && Array.isArray(optionWithTheme.series)) {
          optionWithTheme.series.forEach((series: any) => {
            if (series.type === 'bar') {
              // Set series encoding to make sure bars work with vertical axis
              if (optionWithTheme.dataset && optionWithTheme.dataset.dimensions) {
                const dimensions = optionWithTheme.dataset.dimensions;
                if (dimensions.length >= 2) {
                  series.encode = {
                    x: dimensions[1], // Value dimension
                    y: dimensions[0]  // Category dimension
                  };
                }
              }
            }
          });
        }
      }
      
      // Merge theme options with chart options
      return {
        ...optionWithTheme,
        backgroundColor: currentTheme.backgroundColor,
        textStyle: { ...currentTheme.textStyle, ...(optionWithTheme.textStyle || {}) },
        title: { 
          ...currentTheme.title, 
          ...(optionWithTheme.title || {}),
          textStyle: { 
            ...currentTheme.title.textStyle, 
            ...(optionWithTheme.title?.textStyle || {}) 
          } 
        },
        tooltip: { 
          ...currentTheme.tooltip, 
          ...(optionWithTheme.tooltip || {}) 
        },
        grid: { 
          ...currentTheme.grid, 
          ...(optionWithTheme.grid || {}) 
        },
        legend: {
          ...currentTheme.legend,
          ...(optionWithTheme.legend || {})
        },
        // Add default axes if series requires them and they're not provided
        ...((['bar', 'line', 'scatter'].includes(optionWithTheme.series?.[0]?.type) && !optionWithTheme.xAxis) ? {
          xAxis: {
            type: 'category',
            ...currentTheme.categoryAxis
          }
        } : {}),
        ...((['bar', 'line', 'scatter'].includes(optionWithTheme.series?.[0]?.type) && !optionWithTheme.yAxis) ? {
          yAxis: {
            type: 'value',
            ...currentTheme.valueAxis
          }
        } : {})
      };
    } catch (e) {
      console.error('Error applying theme:', e);
      setChartError('Error applying chart theme');
      return safeOption;
    }
  }, [safeOption, resolvedTheme]);
  
  // Handle chart events
  useEffect(() => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (!chartInstance) return;
    
    // Handle chart rendering events
    const onRenderComplete = () => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Chart render complete');
      }
    };
    
    chartInstance.on('rendered', onRenderComplete);
    
    return () => {
      // Clean up event listeners
      chartInstance.off('rendered', onRenderComplete);
    };
  }, [themedOption]);
  
  // If no valid chart options or there was an error
  if (!themedOption || chartError) {
    return (
      <div 
        className={`flex flex-col items-center justify-center ${className}`} 
        style={{ ...style, minHeight: '300px' }}
      >
        <p className="text-muted-foreground text-sm mb-2">
          {chartError || "No chart data available."}
        </p>
        {process.env.NODE_ENV === 'development' && chartError && (
          <div className="text-xs text-destructive/70 p-2 bg-destructive/10 rounded max-w-md overflow-auto">
            <p>Try checking:</p>
            <ul className="list-disc list-inside">
              <li>Data format matches chart type</li>
              <li>Series configuration is valid</li>
              <li>Dataset is properly defined</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <ReactECharts
      ref={chartRef}
      option={themedOption}
      style={{ height: '100%', width: '100%', minHeight: '300px', ...style }}
      notMerge={false}
      lazyUpdate={true}
      className={className}
      opts={{ 
        renderer: 'canvas', 
        devicePixelRatio: window.devicePixelRatio 
      }}
    />
  );
} 