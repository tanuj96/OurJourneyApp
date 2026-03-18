import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In a real app, you'd store these in a database
// For now, we'll use a simple in-memory store (this will reset on server restart)
const photoMoodCache: Record<string, string[]> = {};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || 'romantic';
    const photoId = searchParams.get('photoId');

    // If photoId is provided, tag that specific photo
    if (photoId) {
      return await tagSinglePhoto(photoId);
    }

    // Otherwise, get a photo by mood
    return await getPhotoByMood(mood);
  } catch (error) {
    console.error('Tag API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function tagSinglePhoto(photoId: string) {
  try {
    // Get photo metadata
    const photo = await drive.files.get({
      fileId: photoId,
      fields: 'id, name, webContentLink',
    });

    // Use AI to analyze photo and suggest moods
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI that analyzes photo titles and suggests mood categories. Respond with only comma-separated moods from this list: happy, romantic, cozy, adventurous, funny, nostalgic, dreamy, grateful"
        },
        {
          role: "user",
          content: `Analyze this photo title: "${photo.data.name}". Suggest appropriate mood categories.`
        }
      ],
      temperature: 0.3,
    });

    const suggestedMoods = completion.choices[0].message.content
      ?.split(',')
      .map(m => m.trim().toLowerCase()) || ['romantic'];

    // Cache the moods
    photoMoodCache[photoId] = suggestedMoods;

    return NextResponse.json({
      photoId,
      name: photo.data.name,
      suggestedMoods,
    });
  } catch (error) {
    console.error('Error tagging photo:', error);
    throw error;
  }
}

async function getPhotoByMood(mood: string) {
  try {
    // Get all photos
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, webContentLink, thumbnailLink, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    
    if (files.length === 0) {
      throw new Error('No photos found');
    }

    // Filter photos by mood if we have tags
    // For now, just return random
    const randomIndex = Math.floor(Math.random() * files.length);
    const photo = files[randomIndex];

    return NextResponse.json({
      photo: {
        id: photo.id,
        name: photo.name,
        webContentLink: `https://drive.google.com/uc?export=view&id=${photo.id}`,
        thumbnailLink: photo.thumbnailLink,
        createdTime: photo.createdTime,
      },
      mood: mood,
    });
  } catch (error) {
    console.error('Error getting photo:', error);
    throw error;
  }
}