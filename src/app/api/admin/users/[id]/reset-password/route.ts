// src/app/api/admin/users/[id]/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { AppError } from '@/lib/errors';

const prisma = new PrismaClient();

export const POST = withAdminAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { newPassword } = body;
    
    if (!newPassword || newPassword.length < 6) {
      return new AppError('Password must be at least 6 characters', 'VALIDATION_ERROR').toResponse();
    }
    
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return new AppError('User not found', 'NOT_FOUND').toResponse();
    }
    
    const passwordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new AppError('Failed to reset password', 'DATABASE_ERROR').toResponse();
  }
});