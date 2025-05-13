import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Call the backend import API
    const response = await apiClient.post('/import/analyze', body);
    
    // Ensure success flag is explicitly set to true even if the backend doesn't include it
    const responseData = response.data;
    if (!responseData.hasOwnProperty('success') && responseData.hasOwnProperty('dataset_info')) {
      // If it's missing success flag but has dataset_info, it's a successful response
      responseData.success = true;
    }
    
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error proxying to import analyze endpoint:', error);
    
    // Detailed error information for debugging
    const errorMessage = error.response?.data?.message || 'Failed to import and analyze file';
    const errorStatus = error.response?.status || 500;
    
    console.log(`Import analyze failed with status ${errorStatus}: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: errorStatus }
    );
  }
} 