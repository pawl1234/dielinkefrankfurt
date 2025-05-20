// src/app/api/admin/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/api-auth';
import { hashPassword, comparePassword } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return new AppError('Invalid password data', 'VALIDATION_ERROR').toResponse();
    }
    
    // Environment users can't change password
    if (token.isEnvironmentUser) {
      return new AppError('Cannot change password for environment user', 'AUTHORIZATION_ERROR').toResponse();
    }
    
    // Find user
    const user = await prisma.user.findUnique({ 
      where: { username: token.username }
    });
    
    if (!user) {
      return new AppError('User not found', 'NOT_FOUND').toResponse();
    }
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return new AppError('Current password is incorrect', 'VALIDATION_ERROR').toResponse();
    }
    
    // Update password
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new AppError('Failed to change password', 'DATABASE_ERROR').toResponse();
  }
});