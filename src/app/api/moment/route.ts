import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Initialize Google Drive
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const moodPrompts: Record<string, string> = {
  happy: "Generate a short, beautiful love quote that expresses happiness and joy. Make it poetic and romantic.",
  romantic: "Generate a short, deeply romantic and passionate love quote that expresses eternal love.",
  cozy: "Generate a short, warm and cozy love quote about comfort and being at home with each other.",
  adventurous: "Generate a short, exciting love quote about sharing adventures and exploring life together.",
  funny: "Generate a short, playful and lighthearted love quote with a touch of humor.",
  nostalgic: "Generate a short, sweet and nostalgic love quote about cherishing beautiful memories.",
  dreamy: "Generate a short, dreamy and ethereal love quote about magical moments together.",
  grateful: "Generate a short, heartfelt love quote about gratitude and appreciation.",
};

async function getRandomPhoto() {
  try {
    console.log('Fetching photos from Google Drive...');
    console.log('Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    
    // Get all photos from the shared folder
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, webContentLink, thumbnailLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} photos`);
    
    if (files.length === 0) {
      throw new Error('No photos found in the folder');
    }

    // Return a random photo
    const randomIndex = Math.floor(Math.random() * files.length);
    const photo = files[randomIndex];
    
    // Fix Google Drive URL
    return {
      ...photo,
      webContentLink: `https://drive.google.com/uc?export=view&id=${photo.id}`,
    };
  } catch (error) {
    console.error('Error fetching from Google Drive:', error);
    throw error;
  }
}

async function generateQuote(mood: string, photoName: string) {
  try {
    console.log('Generating quote with OpenAI...');
    const prompt = moodPrompts[mood] || moodPrompts.romantic;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a romantic poet who writes beautiful, short love quotes. Keep responses under 100 characters, make them personal and heartfelt."
        },
        {
          role: "user",
          content: `${prompt} The photo is called "${photoName}". Make it feel personal and special.`
        }
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    return completion.choices[0].message.content || "Every moment with you is a beautiful memory.";
  } catch (error) {
    console.error('Error generating quote:', error);
    // Fallback quotes if AI fails
    const fallbackQuotes = [
      "Every moment with you is my favorite moment.",
      "You're the best thing that's ever happened to me.",
      "My heart is yours, forever and always.",
      "Loving you is the easiest thing I've ever done.",
      "You make every day brighter just by being you.",
    ];
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== API Route Called ===');
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || 'romantic';
    console.log('Mood requested:', mood);

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      console.error('Missing GOOGLE_CLIENT_EMAIL');
      return NextResponse.json(
        { error: 'Google Drive configuration missing' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing GOOGLE_PRIVATE_KEY');
      return NextResponse.json(
        { error: 'Google Drive configuration missing' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.error('Missing GOOGLE_DRIVE_FOLDER_ID');
      return NextResponse.json(
        { error: 'Google Drive folder ID missing' },
        { status: 500 }
      );
    }

    // Get random photo
    console.log('Fetching random photo...');
    const photo = await getRandomPhoto();
    console.log('Photo fetched:', photo?.name);
    
    if (!photo) {
      return NextResponse.json(
        { error: 'No photos found in your journey folder' },
        { status: 404 }
      );
    }

    // Generate quote based on mood and photo
    console.log('Generating quote...');
    const quote = await generateQuote(mood, photo.name || 'our moment');
    console.log('Quote generated:', quote);

    return NextResponse.json({
      photo: {
        id: photo.id,
        name: photo.name,
        webContentLink: photo.webContentLink,
        thumbnailLink: photo.thumbnailLink,
        createdTime: photo.createdTime,
      },
      quote: quote,
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to create your special moment. Please try again.' },
      { status: 500 }
    );
  }
}