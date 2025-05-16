import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Call the import API without authentication requirements
    const response = await apiClient.post('/', body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error importing file:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to import file data' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 