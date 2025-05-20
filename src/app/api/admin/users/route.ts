// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';
import { AppError } from '@/lib/errors';

const prisma = new PrismaClient();

// Get all users
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const users = await prisma.user.findMany({
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
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return AppError.database('Failed to fetch users').toResponse();

  }
});

// Create new user
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { username, email, password, firstName, lastName, role } = body;
    
    console.log(`Creating user with username: ${username}`);
    
    if (!username || !email || !password) {
      console.log('User creation failed: Missing required fields');
      return AppError.validation('Username, email and password are required').toResponse();
    }
    
    // Log hash generation
    console.log('Generating password hash...');
    const passwordHash = await hashPassword(password);
    console.log('Password hash generated successfully');
    
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'admin',
        isActive: true
      }
    });
    
    console.log(`User created successfully: ${username}, ID: ${newUser.id}`);
    
    const { passwordHash: _, ...userToReturn } = newUser;
    return NextResponse.json(userToReturn, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return AppError.database('Failed to create user').toResponse();
  }
});