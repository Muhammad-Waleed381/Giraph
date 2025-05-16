import apiClient from '@/lib/apiClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all collections regardless of user
    const response = await apiClient.get('/datasources/collections');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Error fetching collections' 
      },
      { status: error.response?.status || 500 }
    );
  }
} 