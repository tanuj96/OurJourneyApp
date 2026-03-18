import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials from file
function getCredentials() {
  try {
    const credentialsPath = path.join(process.cwd(), 'config', 'google-credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return credentials;
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || 'romantic';

    // Load credentials from file
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json(
        { error: 'Failed to load Google credentials. Please check config/google-credentials.json' },
        { status: 500 }
      );
    }

    console.log('Using credentials for:', credentials.client_email);

    // Initialize Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Get folder ID from env
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Google Drive folder ID not configured' },
        { status: 500 }
      );
    }

    // Test folder access first
    try {
      await drive.files.get({ fileId: folderId, fields: 'id' });
    } catch (folderError: any) {
      console.error('Cannot access folder:', folderError.message);
      return NextResponse.json(
        { error: 'Cannot access Google Drive folder. Please make sure it is shared with the service account.' },
        { status: 403 }
      );
    }

    // Get photos from Google Drive
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} photos`);
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No photos found in your journey folder. Please add some photos first.' },
        { status: 404 }
      );
    }

    // Get random photo
    const randomIndex = Math.floor(Math.random() * files.length);
    const photo = files[randomIndex];

    // Quote collections
    const quotesByMood: Record<string, string[]> = {
      romantic: [
        "Every moment with you is a treasure I'll keep forever.",
        "You're the first thought in my mind and the last in my heart.",
        "My love for you grows stronger every single day.",
        "In your arms is exactly where I belong.",
        "You're the best thing that's ever happened to me.",
      ],
      happy: [
        "Your smile is my favorite thing in the entire world.",
        "Happiness is simply being with you.",
        "You make every day brighter just by being you.",
        "With you, every moment is a celebration of love.",
      ],
      cozy: [
        "Wrapped in your love is my safe place.",
        "Home is wherever I'm with you.",
        "These quiet moments with you mean everything.",
        "Your love is my comfort, my peace, my home.",
      ],
      adventurous: [
        "Life's greatest adventure is loving you.",
        "With you by my side, I'm ready for anything.",
        "Our journey together is the best story ever told.",
        "Every day with you is a new adventure.",
      ],
      funny: [
        "You make me laugh even on my worst days.",
        "Life with you is one big, beautiful laugh.",
        "Your silliness is my favorite thing about you.",
        "We laugh together, we love together.",
      ],
      nostalgic: [
        "Every memory with you is a treasure I'll keep forever.",
        "Looking back at us makes me fall in love all over again.",
        "Those moments with you? They're forever my favorite.",
        "Our story is my favorite story to remember.",
      ],
      dreamy: [
        "You're the dream I never want to wake up from.",
        "Loving you feels like a beautiful dream.",
        "You make ordinary moments feel magical.",
        "With you, everything feels possible.",
      ],
      grateful: [
        "Thank you for being you, and for being mine.",
        "I'm grateful for every single moment with you.",
        "Having you in my life is my greatest blessing.",
        "Thank you for choosing me, every single day.",
      ],
    };

    const moodQuotes = quotesByMood[mood] || quotesByMood.romantic;
    const randomQuote = moodQuotes[Math.floor(Math.random() * moodQuotes.length)];

    return NextResponse.json({
      photo: {
        id: photo.id,
        name: photo.name,
        webContentLink: `https://drive.google.com/uc?export=view&id=${photo.id}`,
        createdTime: photo.createdTime,
      },
      quote: randomQuote,
      mood: mood,
    });

  } catch (error: any) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });

    let errorMessage = 'Failed to fetch your special moment.';
    if (error.code === 403) {
      errorMessage = 'Please share your Google Drive folder with the service account email.';
    } else if (error.code === 404) {
      errorMessage = 'Google Drive folder not found. Please check your folder ID.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}