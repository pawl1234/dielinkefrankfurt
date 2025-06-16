import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';

// GET all newsletters (all statuses)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newsletters = await prisma.newsletterItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(newsletters);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    );
  }
}

// POST create new newsletter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, introductionText } = body;

    if (!subject || !introductionText) {
      return NextResponse.json(
        { error: 'Subject and introduction text are required' },
        { status: 400 }
      );
    }

    const newsletter = await prisma.newsletterItem.create({
      data: {
        subject,
        introductionText,
        status: 'draft',
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to create newsletter' },
      { status: 500 }
    );
  }
}