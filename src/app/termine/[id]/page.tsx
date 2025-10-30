import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildAppointmentMetadata } from '@/lib/appointments/metadata-builder';
import { findAppointmentById } from '@/lib/db/appointment-operations';
import AppointmentDetailClient from './AppointmentDetailClient';

/**
 * Extracts numeric appointment ID from URL parameter.
 * Supports both legacy numeric format and new slug format.
 *
 * @param rawId - URL param (e.g., "123" or "123-vollversammlung")
 * @returns Numeric ID or null if invalid
 */
function extractAppointmentId(rawId: string): number | null {
  // Try parsing as pure number first (legacy format)
  const directParse = parseInt(rawId, 10);
  if (!isNaN(directParse)) {
    return directParse;
  }

  // Try extracting ID from slug format (new format: "123-title")
  const match = rawId.match(/^(\d+)-/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Generates dynamic metadata for appointment detail pages.
 *
 * Creates Open Graph tags, Twitter Card tags, and page title
 * based on appointment data for rich link previews.
 *
 * @param params - Route parameters containing appointment ID or slug
 * @returns Next.js Metadata object
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;

  // Extract numeric ID from parameter
  const appointmentId = extractAppointmentId(rawId);

  if (!appointmentId) {
    notFound();
  }

  // Fetch appointment from database
  const appointment = await findAppointmentById(appointmentId);

  if (!appointment || appointment.status !== 'accepted') {
    notFound();
  }

  // Build metadata with Open Graph tags
  return buildAppointmentMetadata(appointment);
}

/**
 * Server component for appointment detail page.
 *
 * Validates appointment ID, fetches data, and renders client component.
 * Handles both numeric URLs (/termine/123) and slug URLs (/termine/123-slug).
 *
 * @param params - Route parameters containing appointment ID or slug
 */
export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;

  // Extract numeric ID from parameter
  const appointmentId = extractAppointmentId(rawId);

  // Handle invalid ID format
  if (!appointmentId) {
    notFound();
  }

  // Fetch appointment
  const appointment = await findAppointmentById(appointmentId);

  // Handle appointment not found or not accepted
  if (!appointment || appointment.status !== 'accepted') {
    notFound();
  }

  /**
   * Smart Slug Routing: Enforce canonical URL
   *
   * Purpose: Ensure each appointment has exactly one URL for SEO and user trust.
   * This prevents URL manipulation (e.g., /termine/123-fake-slug still working).
   *
   * Behavior:
   * - /termine/123-correct-slug  → Render page
   * - /termine/123-wrong-slug    → 308 redirect to correct slug
   * - /termine/123               → 308 redirect to slug URL (if slug exists)
   * - /termine/456               → Render page (old appointments without slug)
   *
   * Note: Old appointments (created before slug feature) have slug=null and
   * remain accessible via numeric ID without redirect. This maintains backwards
   * compatibility with existing shared links.
   */
  if (appointment.slug) {
    if (rawId !== appointment.slug) {
      redirect(`/termine/${appointment.slug}`, 'replace' as any);
    }
  }

  // Convert Date objects to ISO strings for client component
  const appointmentForClient = {
    ...appointment,
    status: appointment.status as 'accepted' | 'pending' | 'rejected',
    startDateTime: appointment.startDateTime.toISOString(),
    endDateTime: appointment.endDateTime?.toISOString() || null,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    processingDate: appointment.processingDate?.toISOString() || null,
    statusChangeDate: appointment.statusChangeDate?.toISOString() || null,
  };

  // Render client component with appointment data
  return <AppointmentDetailClient appointment={appointmentForClient} appointmentId={rawId} />;
}
