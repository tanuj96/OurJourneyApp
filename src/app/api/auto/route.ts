import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Helper to parse private key (handle newline escaping)
function parsePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  // Replace escaped newlines with actual newlines
  return key.replace(/\\n/g, '\n');
}

// Initialize Google Drive
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
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

// Cache for photos with mood analysis
const photosCache: Map<string, any[]> = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getPhotosFromDrive() {
  try {
    console.log('Fetching photos from Google Drive folder:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, webContentLink, thumbnailLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
    });

    let files = response.data.files || [];
    console.log(`Found ${files.length} photos in Google Drive`);
    
    if (files.length === 0) {
      throw new Error('No photos found in the Google Drive folder');
    }

    // Fix Google Drive URLs and ensure all fields are strings
    files = files.map((file: any) => ({
      id: file.id || '',
      name: (file.name || 'Photo') as string,
      webContentLink: `https://drive.google.com/uc?export=view&id=${file.id}`,
      thumbnailLink: file.thumbnailLink || '',
      createdTime: file.createdTime || new Date().toISOString(),
    }));

    return files;
  } catch (error) {
    console.error('Error fetching from Google Drive:', error);
    throw error;
  }
}

async function detectPhotoMood(photoUrl: string, photoName: string): Promise<string> {
  try {
    console.log(`Analyzing photo mood for: ${photoName}`);
    
    // Create a simple mood analysis based on photo name
    // This is a fallback since GPT-4 Vision might not be available
    const nameWords = photoName.toLowerCase();
    
    // Simple keyword matching for mood detection
    if (nameWords.includes('adventure') || nameWords.includes('mountain') || nameWords.includes('travel')) return 'adventurous';
    if (nameWords.includes('love') || nameWords.includes('kiss') || nameWords.includes('romantic')) return 'romantic';
    if (nameWords.includes('laugh') || nameWords.includes('fun') || nameWords.includes('smile')) return 'funny';
    if (nameWords.includes('cozy') || nameWords.includes('home') || nameWords.includes('warm')) return 'cozy';
    if (nameWords.includes('memory') || nameWords.includes('old') || nameWords.includes('nostalgic')) return 'nostalgic';
    if (nameWords.includes('dream') || nameWords.includes('magic') || nameWords.includes('ethereal')) return 'dreamy';
    if (nameWords.includes('grateful') || nameWords.includes('thank') || nameWords.includes('blessed')) return 'grateful';
    if (nameWords.includes('happy') || nameWords.includes('joy') || nameWords.includes('celebration')) return 'happy';
    
    // Try GPT-4 Vision if available as backup
    try {
      const analysisPrompt = `You are analyzing a couples photo called "${photoName}". Quickly determine its mood from these options: happy, romantic, cozy, adventurous, funny, nostalgic, dreamy, grateful. Respond with ONLY the mood name.`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: photoUrl },
              },
              {
                type: "text",
                text: analysisPrompt,
              },
            ],
          },
        ],
        max_tokens: 10,
        temperature: 0.3,
      });

      const detectedMood = completion.choices[0].message.content?.toLowerCase().trim() || 'romantic';
      console.log(`AI Detected mood: ${detectedMood}`);
      return detectedMood;
    } catch (aiError) {
      console.warn('GPT-4 Vision not available, using keyword matching');
      // Fallback to random if no keywords match
      const moods = ['happy', 'romantic', 'cozy', 'adventurous', 'funny', 'nostalgic', 'dreamy', 'grateful'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      console.log(`Fallback mood: ${randomMood}`);
      return randomMood;
    }
  } catch (error) {
    console.error('Error in detectPhotoMood:', error);
    // Return random mood on complete failure
    const moods = ['happy', 'romantic', 'cozy', 'adventurous', 'funny', 'nostalgic', 'dreamy', 'grateful'];
    return moods[Math.floor(Math.random() * moods.length)];
  }
}

async function getPhotosByMood(requestedMood: string) {
  try {
    const cacheKey = 'allPhotosWithMoods';
    const now = Date.now();
    
    // Check cache
    if (photosCache.has(cacheKey)) {
      const cachedData = photosCache.get(cacheKey);
      if (cachedData && now - (cachedData[0]?.timestamp || 0) < CACHE_DURATION) {
        console.log('Using cached photos');
        const matchingPhotos = cachedData.filter(p => p.mood === requestedMood);
        if (matchingPhotos.length > 0) {
          return matchingPhotos;
        }
      }
    }

    // Fetch all photos from Google Drive
    const allPhotos = await getPhotosFromDrive();
    const photosWithMoods = [];

    // Analyze each photo's mood
    console.log(`Analyzing mood for ${allPhotos.length} photos...`);
    for (const photo of allPhotos) {
      try {
        const photoUrl = (photo.webContentLink as string) || '';
        const photoName = (photo.name as string) || 'unknown';
        const mood = await detectPhotoMood(photoUrl, photoName);
        photosWithMoods.push({
          ...photo,
          mood: mood as string,
          timestamp: now,
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to analyze mood for ${photo.name}:`, err);
      }
    }

    // Cache the results
    photosCache.set(cacheKey, photosWithMoods);

    // Filter by requested mood
    const matchingPhotos = photosWithMoods.filter(p => p.mood === requestedMood);
    console.log(`Found ${matchingPhotos.length} photos matching mood: ${requestedMood}`);
    
    return matchingPhotos.length > 0 ? matchingPhotos : photosWithMoods; // Fallback to all if no matches
  } catch (error) {
    console.error('Error filtering photos by mood:', error);
    throw error;
  }
}

async function generateQuote(mood: string, photoName: string) {
  // Fallback quotes for when OpenAI API is unavailable
  const fallbackQuotes = [
    "Every moment with you is my favorite moment.",
    "You're the best thing that's ever happened to me.",
    "My heart is yours, forever and always.",
    "Loving you is the easiest thing I've ever done.",
    "You make every day brighter just by being you.",
  ];

  try {
    console.log(`Generating quote for mood: ${mood}`);
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

    return completion.choices[0].message.content || fallbackQuotes[0];
  } catch (error: any) {
    console.warn('OpenAI API unavailable, using fallback quote:', error.message);
    // Return a random fallback quote instead of throwing
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Auto API Route Called ===');
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || 'romantic';
    console.log('Mood requested:', mood);

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      console.error('Missing GOOGLE_CLIENT_EMAIL');
      return NextResponse.json(
        { error: 'Google Drive not configured - missing client email' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing GOOGLE_PRIVATE_KEY');
      return NextResponse.json(
        { error: 'Google Drive not configured - missing private key' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.error('Missing GOOGLE_DRIVE_FOLDER_ID');
      return NextResponse.json(
        { error: 'Google Drive not configured - missing folder ID' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY');
      return NextResponse.json(
        { error: 'OpenAI not configured - missing API key' },
        { status: 500 }
      );
    }

    // Get photos matching the requested mood
    console.log(`Fetching photos with mood: ${mood}...`);
    let matchingPhotos: any[] = [];
    
    try {
      matchingPhotos = await getPhotosByMood(mood);
    } catch (photoError) {
      console.error('Error fetching photos by mood:', photoError);
      return NextResponse.json(
        { error: `Failed to fetch photos: ${photoError instanceof Error ? photoError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    if (!matchingPhotos || matchingPhotos.length === 0) {
      console.warn(`No photos found for mood: ${mood}`);
      return NextResponse.json(
        { error: `No photos found. Please check that your Google Drive folder has images.` },
        { status: 404 }
      );
    }

    // Select a random photo from matching ones
    const randomIndex = Math.floor(Math.random() * matchingPhotos.length);
    const selectedPhoto = matchingPhotos[randomIndex];
    
    console.log(`Selected photo: ${selectedPhoto.name} (detected mood: ${selectedPhoto.mood})`);
    
    // Generate quote based on mood and photo
    console.log('Generating quote...');
    let quote = "Every moment with you is a beautiful memory.";
    
    try {
      quote = await generateQuote(mood, selectedPhoto.name || 'our moment');
      console.log('Quote generated:', quote);
    } catch (quoteError) {
      console.warn('Failed to generate quote, using default:', quoteError);
      // Use default quote, don't fail the request
    }

    // Use authenticated proxy to serve images
    const proxyUrl = `/api/image-serve?id=${selectedPhoto.id}`;

    const response = {
      photo: {
        id: selectedPhoto.id,
        name: selectedPhoto.name,
        webContentLink: proxyUrl,
        createdTime: selectedPhoto.createdTime,
      },
      quote: quote,
      detectedMood: selectedPhoto.mood,
      mood: mood,
    };

    console.log('Returning response:', { 
      photoName: response.photo.name, 
      detectedMood: response.detectedMood,
      requestedMood: mood 
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Auto API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: `Failed to create your special moment: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add endpoint to refresh cache
export async function POST() {
  try {
    console.log('Clearing cache...');
    photosCache.clear();
    return NextResponse.json({ success: true, message: 'Cache refreshed' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to refresh cache' }, { status: 500 });
  }
}