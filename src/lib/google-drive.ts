import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Try multiple authentication methods
async function getAuth() {
  // Method 1: Try service account JSON file if it exists
  try {
    const credentialsPath = path.join(process.cwd(), 'config', 'google-credentials.json');
    if (fs.existsSync(credentialsPath)) {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      console.log('Using credentials from file:', credentials.client_email);
      return new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    }
  } catch (error) {
    console.log('No credentials file found, trying environment variables...');
  }

  // Method 2: Try environment variables
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      return new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } catch (error) {
      console.error('Failed to use environment variables:', error);
    }
  }

  return null;
}

// Cache for photos to avoid repeated API calls
let photosCache: any[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getPhotosFromDrive() {
  try {
    // Return cached photos if available
    if (photosCache.length > 0 && Date.now() - lastCacheTime < CACHE_DURATION) {
      console.log('Returning cached photos:', photosCache.length);
      return photosCache;
    }

    const auth = await getAuth();
    if (!auth) {
      console.log('No authentication available, using fallback');
      return getFallbackPhotos();
    }

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      console.log('No folder ID, using fallback');
      return getFallbackPhotos();
    }

    console.log('Fetching photos from Google Drive...');
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} photos`);

    // Transform to our photo format
    const photos = files.map((file: any) => ({
      id: file.id,
      name: file.name,
      fileId: file.id,
      date: file.createdTime?.split('T')[0] || new Date().toISOString().split('T')[0],
    }));

    // Update cache
    photosCache = photos;
    lastCacheTime = Date.now();

    return photos;

  } catch (error) {
    console.error('Error fetching from Google Drive:', error);
    return getFallbackPhotos();
  }
}

// Fallback photos in case Drive fails
function getFallbackPhotos() {
  return [
    {
      id: 'fallback-1',
      name: 'Our Beautiful Moment',
      fileId: '12tE6v94kczvV2GOMV32vXMq6ACFxgBYi', // Your working photo
      date: '2024-01-15',
    },
  ];
}

// Get a random photo by mood (you can enhance this with AI tagging later)
export async function getRandomPhotoByMood(mood: string) {
  const photos = await getPhotosFromDrive();
  
  if (photos.length === 0) {
    return null;
  }

  // For now, just return random photo
  // In the future, you can add mood-based filtering here
  const randomIndex = Math.floor(Math.random() * photos.length);
  return photos[randomIndex];
}