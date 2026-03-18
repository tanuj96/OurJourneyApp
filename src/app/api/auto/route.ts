import { NextRequest, NextResponse } from 'next/server';
import { getRandomPhotoByMood } from '@/lib/google-drive';

const quotesByMood: Record<string, string[]> = {
  romantic: [
    "Every moment with you is a treasure I'll keep forever.",
    "You're the first thought in my mind and the last in my heart.",
    "My love for you grows stronger every single day.",
    "In your arms is exactly where I belong.",
    "You're the best thing that's ever happened to me.",
    "My heart beats your name with every pulse.",
    "Loving you is the easiest thing I've ever done.",
  ],
  happy: [
    "Your smile is my favorite thing in the entire world.",
    "Happiness is simply being with you.",
    "You make every day brighter just by being you.",
    "With you, every moment is a celebration.",
    "Your laughter is my favorite sound.",
  ],
  cozy: [
    "Wrapped in your love is my safe place.",
    "Home is wherever I'm with you.",
    "These quiet moments with you mean everything.",
    "Your love is my comfort, my peace, my home.",
    "Nothing beats just being with you.",
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
    "I'd relive every moment with you in a heartbeat.",
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
    "I thank my lucky stars for you every day.",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get('mood') || 'romantic';

    console.log('Auto API called with mood:', mood);

    // Get random photo from Drive
    const photo = await getRandomPhotoByMood(mood);
    
    if (!photo) {
      return NextResponse.json(
        { error: 'No photos found in your journey folder. Please add some photos first.' },
        { status: 404 }
      );
    }

    // Get random quote for mood
    const moodQuotes = quotesByMood[mood] || quotesByMood.romantic;
    const randomQuote = moodQuotes[Math.floor(Math.random() * moodQuotes.length)];

    // Try multiple URL formats for better compatibility
    const imageUrls = [
      `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w1000`,
      `https://drive.google.com/uc?export=view&id=${photo.fileId}`,
      `https://lh3.googleusercontent.com/d/${photo.fileId}=w1000`,
    ];

    return NextResponse.json({
      photo: {
        id: photo.id,
        name: photo.name,
        fileId: photo.fileId,
        webContentLink: imageUrls[0], // Primary URL
        alternativeUrls: imageUrls.slice(1), // Fallback URLs
        createdTime: photo.date,
      },
      quote: randomQuote,
      mood: mood,
    });

  } catch (error: any) {
    console.error('Auto API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch moment' },
      { status: 500 }
    );
  }
}

// Optional: Add endpoint to refresh cache
export async function POST() {
  try {
    // Clear cache by setting lastCacheTime to 0
    const { getPhotosFromDrive } = await import('@/lib/google-drive');
    await getPhotosFromDrive(); // This will refresh the cache
    return NextResponse.json({ success: true, message: 'Cache refreshed' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to refresh cache' }, { status: 500 });
  }
}