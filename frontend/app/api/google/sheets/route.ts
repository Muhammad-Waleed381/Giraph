import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function GET(req: NextRequest) {
  try {
    const response = await apiClient.get('/google/sheets');
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google Sheets endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch Google Sheets' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 