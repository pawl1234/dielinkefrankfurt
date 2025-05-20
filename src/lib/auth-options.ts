import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByCredentials } from './auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // Copy your existing configuration here
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('Authorization failed: Missing credentials');
          return null;
        }
        
        try {
          return await findUserByCredentials(
            credentials.username,
            credentials.password
          );
        } catch (error) {
          console.error('Error during authentication:', error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    // Copy your existing callbacks here
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.isEnvironmentUser = user.isEnvironmentUser || false;
      }
      return token;
    },
    async session({ session, token }) {
        if (session.user) {
            session.user.id = token.id;
            session.user.role = token.role;
            session.user.username = token.username;
            session.user.isEnvironmentUser = token.isEnvironmentUser;
        }
        return session;
    }
  },
  pages: { signIn: '/admin/login' },
  debug: process.env.NODE_ENV === 'development',
  session: { strategy: 'jwt' }
};