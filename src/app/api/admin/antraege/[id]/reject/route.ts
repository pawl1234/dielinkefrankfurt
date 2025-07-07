import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { sendAntragRejectionEmail } from '@/lib/email-notifications';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/antraege/[id]/reject
 * Reject an Antrag with optional decision comment
 */
async function rejectAntrag(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string = '';
  
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Antrag ID is required' },
        { status: 400 }
      );
    }

    // Parse request body for decision comment
    let decisionComment: string | undefined;
    try {
      const body = await request.json();
      decisionComment = body.decisionComment;
    } catch {
      // If no body or invalid JSON, continue without comment
    }

    // Find the antrag first
    const existingAntrag = await prisma.antrag.findUnique({
      where: { id }
    });

    if (!existingAntrag) {
      return NextResponse.json(
        { error: 'Antrag not found' },
        { status: 404 }
      );
    }

    // Check if antrag is already processed
    if (existingAntrag.status !== 'NEU') {
      return NextResponse.json(
        { error: `Antrag has already been ${existingAntrag.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update the antrag status to ABGELEHNT
    const updatedAntrag = await prisma.antrag.update({
      where: { id },
      data: {
        status: 'ABGELEHNT',
        decisionComment: decisionComment || null,
        decidedAt: new Date(),
        // Note: decidedBy could be added if we track admin user info
      }
    });

    // Send rejection email notification
    const emailResult = await sendAntragRejectionEmail(updatedAntrag, decisionComment);
    
    if (!emailResult.success) {
      logger.warn('Failed to send rejection email notification', {
        context: {
          antragId: id,
          applicantEmail: updatedAntrag.email,
          error: emailResult.error
        }
      });
    }

    logger.info('Antrag rejected', {
      context: {
        antragId: id,
        title: updatedAntrag.title,
        applicant: `${updatedAntrag.firstName} ${updatedAntrag.lastName}`,
        emailSent: emailResult.success,
        hasComment: !!decisionComment
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Antrag wurde erfolgreich abgelehnt',
      antrag: {
        id: updatedAntrag.id,
        status: updatedAntrag.status,
        decisionComment: updatedAntrag.decisionComment,
        decidedAt: updatedAntrag.decidedAt
      },
      emailSent: emailResult.success
    });

  } catch (error) {
    logger.error('Error rejecting antrag', {
      context: {
        antragId: id,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    console.error('Error rejecting antrag:', error);
    return NextResponse.json(
      { error: 'Failed to reject antrag' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(rejectAntrag);