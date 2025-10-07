import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Extracts client IP address from request headers
 * 
 * @param request - The NextRequest object
 * @returns Client IP address as string
 */
export function getClientIP(request: NextRequest): string {
  // Check common headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP from comma-separated list
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback to unknown (NextRequest doesn't have ip property)
  return 'unknown';
}

/**
 * Creates a privacy-friendly fingerprint from request headers and IP
 * Uses SHA256 hashing to ensure non-reversible, GDPR-compliant fingerprinting
 * 
 * @param request - The NextRequest object containing headers
 * @returns SHA256 hash string representing the client fingerprint
 */
export function createFingerprint(request: NextRequest): string {
  // Extract headers safely with fallbacks
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const ipAddress = getClientIP(request);
  
  // Use pipe separator to avoid header value conflicts
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ipAddress}`;
  
  // Generate SHA256 hash for privacy compliance
  return createHash('sha256').update(fingerprintData).digest('hex');
}