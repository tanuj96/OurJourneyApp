import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize Google Drive with authentication
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID parameter' },
        { status: 400 }
      );
    }

    // Get file metadata and download
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
      } as any
    );

    // Extract content type from response headers
    const contentType = (response.headers['content-type'] || 'image/jpeg') as string;

    // Create a readable stream response
    return new NextResponse((response.data as any) as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Error serving image:', error.message);
    return NextResponse.json(
      { error: 'Failed to serve image: ' + error.message },
      { status: 500 }
    );
  }
}
