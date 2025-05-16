import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    // Call backend endpoint to clear Google tokens
    const response = await apiClient.post('/google/logout');
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error proxying to Google logout endpoint:', error);
    
    // Even if there's an error, we want to clear client-side auth state
    return NextResponse.json(
      { 
        success: true, 
        message: 'Logged out from Google on the client side'
      }
    );
  }
} 