// src/lib/auth.ts
import * as bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Compare a password with a hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Find user by credentials (for NextAuth)
export async function findUserByCredentials(username: string, password: string) {
  console.log(`Authentication attempt for username: ${username}`);
  
  // Check if this is the env-based admin
  const envAdminUsername = process.env.ADMIN_USERNAME;
  const envAdminPassword = process.env.ADMIN_PASSWORD;
  
  if (username === envAdminUsername && password === envAdminPassword) {
    console.log('Successful login with environment admin credentials');
    return {
      id: 'env-admin',
      username: envAdminUsername,
      name: 'System Admin',
      role: 'admin',
      isEnvironmentUser: true
    };
  }
  
  // Otherwise, check the database
  const user = await prisma.user.findUnique({
    where: { username },
  });
  
  if (!user) {
    console.log(`Authentication failed: User ${username} not found`);
    return null;
  }
  
  if (!user.isActive) {
    console.log(`Authentication failed: User ${username} is inactive`);
    return null;
  }
  
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  
  if (!isPasswordValid) {
    console.log(`Authentication failed: Invalid password for user ${username}`);
    return null;
  }
  
  console.log(`Successful login for user ${username}`);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.firstName ? `${user.firstName} ${user.lastName}` : user.username,
    role: user.role,
    isActive: user.isActive
  };
}