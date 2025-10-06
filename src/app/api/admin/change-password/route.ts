// src/app/api/admin/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/auth';
import { hashPassword, comparePassword } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    if (!token) {
      return AppError.authentication('Invalid or missing authentication token').toResponse();
    }
    
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return AppError.validation('Invalid password data').toResponse();
    }
        
    // Environment users can't change password
    if (token.isEnvironmentUser) {
      return AppError.authorization('Cannot change user of root admin').toResponse();
    }
    
    // Find user
    const user = await prisma.user.findUnique({ 
      where: { username: token.username }
    });

    if (!user) {
      return AppError.notFound('User not found').toResponse();
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return AppError.validation('Current password is incorrect').toResponse();
    }
    
    // Update password
    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch {
    return AppError.database('Failed to change password').toResponse();    
  }
});