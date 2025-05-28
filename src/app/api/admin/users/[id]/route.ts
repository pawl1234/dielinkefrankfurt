// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/api-auth';
import { AppError } from '@/lib/errors';

const prisma = new PrismaClient();

// Get single user
export const GET = withAdminAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return AppError.notFound('User not found').toResponse();      
    }
    
    return NextResponse.json(user);
  } catch (error) {
    return AppError.database('Failed to fetch user').toResponse();          
  }
});

// Update user
export const PUT = withAdminAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, email, firstName, lastName, role, isActive } = body;
    
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return AppError.notFound('User not found').toResponse();          
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        role,
        isActive
      }
    });
    
    const { passwordHash: _, ...userToReturn } = updatedUser;
    return NextResponse.json(userToReturn);
  } catch (error) {
    return AppError.database('Failed to update user').toResponse();              
  }
});

// Delete user
export const DELETE = withAdminAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return AppError.notFound('User not found').toResponse();              
    }
    
    await prisma.user.delete({ where: { id } });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return AppError.database('Failed to delete user').toResponse();                  
  }
});