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
    
    const analysisPrompt = `
You are an expert in analyzing images and emotions. Look at this image and identify its mood/vibe.
The photo is from a couple's journey/memories album.

Based on the visual elements (colors, composition, subject, atmosphere), determine which of these moods best matches:
- happy: bright, cheerful, celebratory
- romantic: intimate, passionate, loving
- cozy: warm, comfortable, homey
- adventurous: exciting, outdoor, exploring
- funny: playful, humorous, lighthearted
- nostalgic: vintage, memories, sentimental
- dreamy: magical, ethereal, dreamy
- grateful: peaceful, appreciative, content

Respond with ONLY the mood name from the list above. For example: "romantic" or "adventurous"
Do not explain, just return the mood name.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: photoUrl,
              },
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
    console.log(`Detected mood for ${photoName}: ${detectedMood}`);
    
    return detectedMood;
  } catch (error) {
    console.error('Error analyzing photo mood:', error);
    // Fallback to random mood if analysis fails
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

    return completion.choices[0].message.content || "Every moment with you is a beautiful memory.";
  } catch (error) {
    console.error('Error generating quote:', error);
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

    // Get photos matching the requested mood
    console.log(`Fetching photos with mood: ${mood}...`);
    const matchingPhotos = await getPhotosByMood(mood);
    
    if (!matchingPhotos || matchingPhotos.length === 0) {
      return NextResponse.json(
        { error: `No photos found matching the "${mood}" mood. Please try another mood.` },
        { status: 404 }
      );
    }

    // Select a random photo from matching ones
    const randomIndex = Math.floor(Math.random() * matchingPhotos.length);
    const selectedPhoto = matchingPhotos[randomIndex];
    
    console.log(`Selected photo: ${selectedPhoto.name} (detected mood: ${selectedPhoto.mood})`);
    
    // Generate quote based on mood and photo
    console.log('Generating quote...');
    const quote = await generateQuote(mood, selectedPhoto.name || 'our moment');
    console.log('Quote generated:', quote);

    return NextResponse.json({
      photo: {
        id: selectedPhoto.id,
        name: selectedPhoto.name,
        webContentLink: selectedPhoto.webContentLink,
        thumbnailLink: selectedPhoto.thumbnailLink,
        createdTime: selectedPhoto.createdTime,
      },
      quote: quote,
      detectedMood: selectedPhoto.mood,
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to create your special moment. Please try again.' },
      { status: 500 }
    );
  }
}