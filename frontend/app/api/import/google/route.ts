import { NextRequest, NextResponse } from 'next/server';
import apiClient from '@/lib/apiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Call the backend endpoint for Google Sheets import without auth
    const response = await apiClient.post('/import/google', body);
    
    // If we get an auth URL back, forward it to the frontend
    if (response.data?.success && response.data?.data?.authUrl) {
      return NextResponse.json({
        success: true,
        authRequired: true,
        authUrl: response.data.data.authUrl,
        message: 'Google authentication required'
      });
    }
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error importing from Google Sheets:', error);
    
    // Check if it's an auth error and extract the auth URL if available
    if (error.response?.status === 401 && error.response?.data?.details?.authUrl) {
      return NextResponse.json({
        success: false,
        authRequired: true,
        authUrl: error.response.data.details.authUrl,
        message: 'Google authentication required'
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: error.response?.data?.message || 'Failed to import data from Google Sheet' 
      },
      { status: error.response?.status || 500 }
    );
  }
}
