import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Update appointment featured status
export async function PATCH(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, featured } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }
    
    if (featured === undefined) {
      return NextResponse.json(
        { error: 'Featured status is required' },
        { status: 400 }
      );
    }
    
    try {
      const updatedAppointment = await prisma.appointment.update({
        where: { id: Number(id) },
        data: { featured }
      });
      
      return NextResponse.json(updatedAppointment);
    } catch (dbError) {
      console.error('Could not update appointment featured status in DB:', dbError);
      return NextResponse.json(
        { error: 'Failed to update appointment in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating appointment featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment featured status' },
      { status: 500 }
    );
  }
}

// Get all appointments with featured status (useful for newsletter editing UI)
export async function GET(request: NextRequest) {
  // Verify admin session
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all future accepted appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'accepted',
        startDateTime: {
          gte: new Date() // Only future events
        }
      },
      orderBy: {
        startDateTime: 'asc'
      },
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        featured: true
      }
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