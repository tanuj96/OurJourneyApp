import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('id');

    if (!fileId) {
      return new NextResponse('Missing file ID', { status: 400 });
    }

    // Fetch the image from Google Drive
    const response = await fetch(`https://drive.google.com/uc?export=view&id=${fileId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get the image data as array buffer
    const imageData = await response.arrayBuffer();
    
    // Get content type from response
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to load image', { status: 500 });
  }
}