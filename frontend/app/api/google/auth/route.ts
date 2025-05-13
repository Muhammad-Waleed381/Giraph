import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function GET(req: NextRequest) {
  try {
    const response = await apiClient.get('/google/auth');
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google auth endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to get Google authentication URL' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 