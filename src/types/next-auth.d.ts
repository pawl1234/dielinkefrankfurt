// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';
import { UserRole } from './user';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email?: string;
      name?: string;
      role: UserRole;
      isEnvironmentUser?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    email?: string;
    name?: string;
    role: UserRole;
    isActive?: boolean;
    isEnvironmentUser?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: UserRole;
    isEnvironmentUser?: boolean;
  }
}