import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// GET single newsletter
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const newsletter = await prisma.newsletterItem.findUnique({
      where: { id },
    });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter' },
      { status: 500 }
    );
  }
}

// PUT update newsletter
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subject, introductionText, content, status, recipientCount, sentAt, settings } = body;

    const newsletter = await prisma.newsletterItem.update({
      where: { id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(introductionText !== undefined && { introductionText }),
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status }),
        ...(recipientCount !== undefined && { recipientCount }),
        ...(sentAt !== undefined && { sentAt: sentAt ? new Date(sentAt) : null }),
        ...(settings !== undefined && { settings }),
      },
    });

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error updating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to update newsletter' },
      { status: 500 }
    );
  }
}

// DELETE newsletter
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    await prisma.newsletterItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to delete newsletter' },
      { status: 500 }
    );
  }
}