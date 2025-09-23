/**
 * Reusable validation utilities for API routes.
 * Extracted from legacy antrag-validator.ts for better organization.
 */

/**
 * Validate reCAPTCHA token
 */
export async function validateRecaptcha(token?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // If reCAPTCHA is not configured, skip validation
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured, skipping validation');
    return true;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();

    // Check if verification was successful and score is above threshold
    if (data.success) {
      // For v3, check score (0.0 - 1.0, where 1.0 is very likely human)
      if (data.score !== undefined) {
        return data.score >= 0.5; // Adjust threshold as needed
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('reCAPTCHA validation error:', error);
    return false;
  }
}

/**
 * Rate limiting functions for API protection
 */
export function shouldRateLimit(
  ip: string,
  requestCounts: Map<string, { count: number; firstRequest: number }>,
  maxRequests: number = 5,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const ipData = requestCounts.get(ip);

  if (!ipData) {
    // First request from this IP
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return false;
  }

  // Check if window has expired
  if (now - ipData.firstRequest > windowMs) {
    // Reset window
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return false;
  }

  // Increment count
  ipData.count++;

  // Check if limit exceeded
  return ipData.count > maxRequests;
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimitMap(
  requestCounts: Map<string, { count: number; firstRequest: number }>,
  windowMs: number = 60000
): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  requestCounts.forEach((data, ip) => {
    if (now - data.firstRequest > windowMs) {
      keysToDelete.push(ip);
    }
  });

  keysToDelete.forEach(key => {
    requestCounts.delete(key);
  });
}