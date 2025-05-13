import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const response = await apiClient.get(`/google/sheets/${id}/tabs`);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google Sheet tabs endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch sheet tabs' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 