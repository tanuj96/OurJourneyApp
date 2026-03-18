import { NextRequest, NextResponse } from "next/server";

// Sample photos data - Replace these with your actual Google Drive file IDs
// To get file IDs: Right-click on photo in Google Drive → Get link → Copy the ID from the URL
const PHOTOS = [
  {
    id: "1",
    name: "Our Beautiful Moment", // You can rename this to whatever you want
    fileId: "12tE6v94kczvV2GOMV32vXMq6ACFxgBYi", // Your actual photo ID
    date: "2024-01-15", // You can change this to the actual date
  },
  {
    id: "2",
    name: "Our Beautiful Moment", // You can rename this to whatever you want
    fileId: "12tE6v94kczvV2GOMV32vXMq6ACFxgBYi", // Your actual photo ID
    date: "2024-01-15", // You can change this to the actual date
  },
  {
    id: "3",
    name: "Our Beautiful Moment", // You can rename this to whatever you want
    fileId: "12tE6v94kczvV2GOMV32vXMq6ACFxgBYi", // Your actual photo ID
    date: "2024-01-15", // You can change this to the actual date
  },
];

const quotesByMood: Record<string, string[]> = {
  romantic: [
    "Every moment with you is a treasure I'll keep forever.",
    "You're the first thought in my mind and the last in my heart.",
    "My love for you grows stronger every single day.",
    "In your arms is exactly where I belong.",
    "You're the best thing that's ever happened to me.",
    "My heart beats your name with every pulse.",
    "Loving you is the easiest thing I've ever done.",
    "You're every love song I've ever heard.",
  ],
  happy: [
    "Your smile is my favorite thing in the entire world.",
    "Happiness is simply being with you.",
    "You make every day brighter just by being you.",
    "With you, every moment is a celebration.",
    "Your laughter is my favorite sound.",
    "You're my favorite reason to smile.",
  ],
  cozy: [
    "Wrapped in your love is my safe place.",
    "Home is wherever I'm with you.",
    "These quiet moments with you mean everything.",
    "Your love is my comfort, my peace, my home.",
    "Nothing beats just being with you.",
    "You're my cozy place in this wild world.",
  ],
  adventurous: [
    "Life's greatest adventure is loving you.",
    "With you by my side, I'm ready for anything.",
    "Our journey together is the best story ever told.",
    "Every day with you is a new adventure.",
    "Exploring life with you is my favorite thing to do.",
  ],
  funny: [
    "You make me laugh even on my worst days.",
    "Life with you is one big, beautiful laugh.",
    "Your silliness is my favorite thing about you.",
    "We laugh together, we love together.",
    "You're the punchline to all my best jokes.",
    "Our love is my favorite joke, and I never get tired of it.",
  ],
  nostalgic: [
    "Every memory with you is a treasure I'll keep forever.",
    "Looking back at us makes me fall in love all over again.",
    "Those moments with you? They're forever my favorite.",
    "Our story is my favorite story to remember.",
    "I'd relive every moment with you in a heartbeat.",
    "The best times of my life are the ones I've spent with you.",
  ],
  dreamy: [
    "You're the dream I never want to wake up from.",
    "Loving you feels like a beautiful dream.",
    "You make ordinary moments feel magical.",
    "With you, everything feels possible.",
    "You're the magic in my everyday life.",
    "In your eyes, I've found my forever.",
  ],
  grateful: [
    "Thank you for being you, and for being mine.",
    "I'm grateful for every single moment with you.",
    "Having you in my life is my greatest blessing.",
    "Thank you for choosing me, every single day.",
    "I thank my lucky stars for you every day.",
    "You're the best thing that's ever happened to me.",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mood = searchParams.get("mood") || "romantic";

    console.log("Working API called with mood:", mood);

    // If no photos configured, return a helpful message
    if (PHOTOS.length === 0 || PHOTOS[0].fileId === "YOUR_FILE_ID_1") {
      return NextResponse.json({
        photo: {
          id: "sample",
          name: "Sample Photo",
          webContentLink:
            "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800",
          createdTime: new Date().toISOString(),
        },
        quote:
          "This is a sample quote. To see your photos, replace the file IDs in the code.",
        mood: mood,
        note: "Please update the PHOTOS array in src/app/api/working/route.ts with your Google Drive file IDs",
      });
    }

    // Get random photo
    const randomIndex = Math.floor(Math.random() * PHOTOS.length);
    const photo = PHOTOS[randomIndex];

    // Get random quote for mood
    const moodQuotes = quotesByMood[mood] || quotesByMood.romantic;
    const randomQuote =
      moodQuotes[Math.floor(Math.random() * moodQuotes.length)];

    return NextResponse.json({
      photo: {
        id: photo.id,
        name: photo.name,
        fileId: photo.fileId, // Add this line
        webContentLink: `https://drive.google.com/thumbnail?id=${photo.fileId}&sz=w1000`,
        createdTime: photo.date,
      },
      quote: randomQuote,
      mood: mood,
    });
  } catch (error: any) {
    console.error("Working API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch moment" },
      { status: 500 },
    );
  }
}
