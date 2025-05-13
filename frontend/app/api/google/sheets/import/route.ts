import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await apiClient.post('/google/sheets/import', body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google Sheets import endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to import data from Google Sheet' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 