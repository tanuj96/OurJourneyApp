"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export default function Home() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_APP_PASSWORD || password === "ourlove123") {
      localStorage.setItem("isAuthenticated", "true");
      router.push("/journey");
    } else {
      setError("Incorrect password. Try again, my love ❤️");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-red-50 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Heart className="w-20 h-20 text-pink-500 mx-auto mb-4 animate-heart-beat" fill="currentColor" />
          <h1 className="text-4xl font-bold gradient-text mb-2">Our Journey</h1>
          <p className="text-gray-600">A beautiful story of us</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter the secret password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                placeholder="💝 Enter our secret word"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-pink-600 text-sm text-center animate-pulse">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition transform hover:scale-105"
            >
              Open Our Journey ✨
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Made with 💖 for you</p>
        </div>
      </div>
    </div>
  );
}