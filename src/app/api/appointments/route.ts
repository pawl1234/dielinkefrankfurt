import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/appointments
 * 
 * Retrieves public appointments with optional filtering.
 * By default, returns all upcoming appointments that have been accepted.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If ID is provided, return a single appointment
    if (id) {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: parseInt(id),
          status: 'accepted' // Only show accepted appointments
        }
      });
      
      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(appointment);
    }
    
    // Otherwise, return filtered appointments
    const currentDate = new Date();
    
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'accepted',
        startDateTime: {
          gte: currentDate // Only future appointments
        }
      },
      orderBy: {
        startDateTime: 'asc' // Chronological order
      },
      select: {
        id: true,
        title: true,
        teaser: true,
        startDateTime: true,
        endDateTime: true,
        street: true,
        city: true,
        state: true,
        postalCode: true
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