/**
 * Utility function to get the base URL with proper protocol
 * Centralized to ensure consistent URL generation across the application
 */
export function getBaseUrl(): string {
  // If VERCEL_PROJECT_PRODUCTION_URL is provided
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    const url = process.env.VERCEL_PROJECT_PRODUCTION_URL.trim();
    
    // Check if URL already has a protocol
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Add https protocol if missing
    return `https://${url}`;
  }
  
  if (typeof window === 'undefined') { // Only log on server side
    console.error('Warning: VERCEL_PROJECT_PRODUCTION_URL environment variable is not set. Falling back to localhost:3000');
  }
  
  return 'http://localhost:3000';
}