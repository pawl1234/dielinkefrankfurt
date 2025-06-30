/**
 * API-related types and interfaces
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Context object for simple API routes (no dynamic params)
 */
export interface SimpleRouteContext {
  [key: string]: unknown;
}

/**
 * Context object for API routes with dynamic ID parameter
 */
export interface IdRouteContext {
  params: Promise<{ id: string }>;
  [key: string]: unknown;
}

/**
 * Context object for API routes with dynamic slug parameter
 */
export interface SlugRouteContext {
  params: Promise<{ slug: string }>;
  [key: string]: unknown;
}

/**
 * Union type covering all possible Next.js API route context shapes
 */
export type NextJSRouteContext = SimpleRouteContext | IdRouteContext | SlugRouteContext;

/**
 * Type for API handler functions with proper type safety
 * Uses generic parameter to accommodate different context shapes
 */
export type ApiHandler<TContext = NextJSRouteContext> = (request: NextRequest, context?: TContext) => Promise<NextResponse>;

/**
 * Result of processing a single email in newsletter sending
 */
export interface EmailSendResult {
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Result of processing a chunk of emails in newsletter sending
 */
export interface ChunkResult {
  sentCount: number;
  failedCount: number;
  completedAt: string;
  results: EmailSendResult[];
}

/**
 * Newsletter sending settings with chunk tracking
 */
export interface NewsletterSendingSettings {
  chunkResults: ChunkResult[];
  totalSent: number;
  totalFailed: number;
  lastChunkCompletedAt: string;
  completedChunks: number;
  totalRecipients?: number;
  successfulSends?: number;
  failedSends?: number;
  adminNotificationEmail?: string;
  [key: string]: unknown;
}