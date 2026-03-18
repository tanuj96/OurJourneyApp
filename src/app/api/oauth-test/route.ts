import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// This endpoint will generate an OAuth URL for you to authorize
export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    'YOUR_CLIENT_ID', // Replace with your OAuth client ID
    'YOUR_CLIENT_SECRET', // Replace with your OAuth client secret
    'http://localhost:3000/api/oauth-callback' // Redirect URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return NextResponse.json({ url });
}