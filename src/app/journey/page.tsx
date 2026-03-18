"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Heart, 
  Sparkles, 
  Smile, 
  Coffee, 
  Sunset, 
  Camera, 
  Star,
  RefreshCw,
  Loader2,
  ImageOff
} from "lucide-react";
import Image from "next/image";

const moods = [
  { id: "happy", name: "Happy", icon: Smile, color: "bg-yellow-400", textColor: "text-yellow-700" },
  { id: "romantic", name: "Romantic", icon: Heart, color: "bg-pink-400", textColor: "text-pink-700" },
  { id: "cozy", name: "Cozy", icon: Coffee, color: "bg-orange-400", textColor: "text-orange-700" },
  { id: "adventurous", name: "Adventurous", icon: Sunset, color: "bg-purple-400", textColor: "text-purple-700" },
  { id: "funny", name: "Funny", icon: Smile, color: "bg-green-400", textColor: "text-green-700" },
  { id: "nostalgic", name: "Nostalgic", icon: Camera, color: "bg-blue-400", textColor: "text-blue-700" },
  { id: "dreamy", name: "Dreamy", icon: Sparkles, color: "bg-indigo-400", textColor: "text-indigo-700" },
  { id: "grateful", name: "Grateful", icon: Star, color: "bg-amber-400", textColor: "text-amber-700" },
];

interface Photo {
  id: string;
  name: string;
  webContentLink: string;
  thumbnailLink?: string;
  createdTime: string;
  fileId?: string;
  alternativeUrls?: string[];
}

interface JourneyMoment {
  photo: Photo;
  quote: string;
  mood: string;
}

export default function Journey() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState("romantic");
  const [loading, setLoading] = useState(false);
  const [moment, setMoment] = useState<JourneyMoment | null>(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem("isAuthenticated");
    if (!isAuth) {
      router.push("/");
    }
  }, [router]);

  const fetchRandomMoment = async () => {
    setLoading(true);
    setError("");
    setImageError(false);
    setMoment(null);
    setRetryCount(0);
    
    try {
      const response = await fetch(`/api/auto?mood=${selectedMood}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch moment");
      }
      
      setMoment(data);
    } catch (err) {
      setError("Couldn't fetch a moment right now. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = () => {
    if (moment && moment.photo.alternativeUrls && retryCount < moment.photo.alternativeUrls.length) {
      // Try next alternative URL
      setMoment({
        ...moment,
        photo: {
          ...moment.photo,
          webContentLink: moment.photo.alternativeUrls[retryCount]
        }
      });
      setRetryCount(retryCount + 1);
      setImageError(false);
    } else {
      setImageError(true);
    }
  };

  const handleRetryImage = () => {
    setImageError(false);
    setRetryCount(0);
    if (moment && moment.photo.fileId) {
      // Reset to first URL format
      setMoment({
        ...moment,
        photo: {
          ...moment.photo,
          webContentLink: `https://drive.google.com/thumbnail?id=${moment.photo.fileId}&sz=w1000`
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-pink-500" fill="currentColor" />
              <h1 className="text-xl font-bold gradient-text">Our Journey</h1>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("isAuthenticated");
                router.push("/");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Lock Journey 🔒
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Mood Selector */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How are you feeling, my love?
          </h2>
          <p className="text-gray-600 mb-8">Pick a mood, and I&apos;ll find the perfect memory for you 💕</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {moods.map((mood) => {
              const Icon = mood.icon;
              return (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
                    selectedMood === mood.id
                      ? `${mood.color} text-white shadow-lg`
                      : "bg-white hover:bg-gray-50 text-gray-700 shadow"
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">{mood.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center">
          <button
            onClick={fetchRandomMoment}
            disabled={loading}
            className="mb-8 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:from-pink-600 hover:to-purple-700 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Finding a special moment...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>Show me a {moods.find(m => m.id === selectedMood)?.name} moment</span>
              </>
            )}
          </button>

          {error && (
            <div className="text-pink-600 text-center mb-4 p-4 bg-pink-50 rounded-lg">
              {error}
            </div>
          )}

          {moment && (
            <div className="w-full max-w-4xl animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Photo */}
                <div className="relative aspect-video w-full bg-gray-100 cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setModalOpen(true)}>
                  {!imageError ? (
                    <Image
                      src={moment.photo.webContentLink}
                      alt={moment.photo.name}
                      fill
                      className="object-cover"
                      onError={handleImageError}
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-r from-pink-50 to-purple-50">
                      <ImageOff className="w-16 h-16 text-pink-300 mb-2" />
                      <p className="text-gray-400 text-sm">This memory is loading differently</p>
                      <button
                        onClick={handleRetryImage}
                        className="mt-2 text-xs text-pink-500 hover:text-pink-600 underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Quote */}
                <div className="p-8 text-center">
                  <div className="relative">
                    <Heart className="w-8 h-8 text-pink-200 absolute -top-2 left-0" />
                    <p className="text-xl md:text-2xl text-gray-800 italic font-light px-8">
                      &quot;{moment.quote}&quot;
                    </p>
                    <Heart className="w-8 h-8 text-pink-200 absolute -bottom-2 right-0 transform rotate-180" />
                  </div>
                  
                  {/* Date */}
                  <p className="text-sm text-gray-400 mt-4">
                    {new Date(moment.photo.createdTime).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Image Modal */}
          {modalOpen && moment && (
            <div 
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setModalOpen(false)}
            >
              <div 
                className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={moment.photo.webContentLink}
                  alt={moment.photo.name}
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-300 transition bg-black/50 hover:bg-black/70 p-2 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Empty state when no moment */}
          {!moment && !loading && !error && (
            <div className="text-center py-20">
              <Heart className="w-20 h-20 text-pink-200 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Click the button above to see a special moment! ✨</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}