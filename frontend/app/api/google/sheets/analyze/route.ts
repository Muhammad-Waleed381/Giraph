import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await apiClient.post('/google/sheets/analyze', body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google Sheets analyze endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to analyze Google Sheet' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 