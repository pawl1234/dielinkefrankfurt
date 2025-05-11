import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Get all appointments with optional filtering
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';
    const status = url.searchParams.get('status');

    // Build filter based on parameters
    const filter: any = {};
    const currentDate = new Date();

    // View-based filtering
    if (view === 'pending') {
      filter.status = 'pending';
    } else if (view === 'upcoming') {
      filter.status = 'accepted';
      filter.startDateTime = { gte: currentDate };
    } else if (view === 'archive') {
      // For archive view, get past appointments (both accepted and rejected)
      filter.OR = [
        { status: 'accepted', startDateTime: { lt: currentDate } },
        { status: 'rejected' }
      ];
    }

    // Override with specific status if provided
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      // Remove any existing status filters
      if (filter.OR) {
        delete filter.OR;
      }
      filter.status = status;
    }

    // Get appointments with filters
    const appointments = await prisma.appointment.findMany({
      where: filter,
      orderBy: [
        // For upcoming events, sort by date ascending
        ...(view === 'upcoming' ? [{ startDateTime: 'asc' as const }] : []),
        // For all other views, newest first
        { createdAt: 'desc' as const }
      ],
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

// Update appointment (mark as processed, accept or reject)
export async function PATCH(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, processed, status } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Handle processed flag if present
    if (processed !== undefined) {
      updateData.processed = processed;
      updateData.processingDate = processed ? new Date() : null;
    }

    // Handle status change if present
    if (status !== undefined) {
      // Validate status value
      if (!['pending', 'accepted', 'rejected'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value. Must be one of: pending, accepted, rejected' },
          { status: 400 }
        );
      }
      updateData.status = status;

      // When status changes, update processing info as well
      if (status !== 'pending') {
        updateData.processed = true;
        updateData.processingDate = new Date();
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}