import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envStatus = {
      googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing',
      googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY ? '✅ Set' : '❌ Missing',
      googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID ? '✅ Set' : '❌ Missing',
      openAIApiKey: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
      nodeEnv: process.env.NODE_ENV,
    };

    return NextResponse.json({
      message: 'API is working!',
      environment: envStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}