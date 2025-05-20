// src/types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
}