// src/app/api/admin/users/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { AppError } from '@/lib/errors';

const prisma = new PrismaClient();

export const POST = withAdminAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;
    
    if (!newPassword || newPassword.length < 6) {
      return AppError.validation('Password must be at least 6 characters').toResponse();
    }
    
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return AppError.notFound('User not found').toResponse();
    }
    
    const passwordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch {
    return AppError.database('Failed to reset password').toResponse();
  }
});