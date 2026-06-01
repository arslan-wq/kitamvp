import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email & Password
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        // Try staff user first
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user && user.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (isPasswordValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              kitaId: user.kitaId,
              type: 'staff',
            };
          }
        }

        // Try parent user
        const parent = await prisma.parent.findUnique({
          where: { email: credentials.email },
        });

        if (parent && parent.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            parent.password
          );

          if (isPasswordValid) {
            return {
              id: parent.id,
              email: parent.email,
              name: `${parent.firstName} ${parent.lastName}`,
              role: 'PARENT',
              type: 'parent',
            };
          }
        }

        throw new Error('Invalid credentials');
      },
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),

    // Apple OAuth
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'PARENT';
        token.kitaId = (user as any).kitaId;
        token.type = (user as any).type || 'parent';
      }
      
      // OAuth: check if parent exists
      if (account && token.email) {
        const parent = await prisma.parent.findUnique({
          where: { email: token.email },
        });
        
        if (parent) {
          token.role = 'PARENT';
          token.type = 'parent';
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || 'PARENT';
        (session.user as any).kitaId = token.kitaId;
        (session.user as any).type = token.type || 'parent';
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },

    async signIn({ user, account, profile }) {
      // Handle OAuth signup
      if (account?.provider === 'google' || account?.provider === 'apple') {
        const existingParent = await prisma.parent.findUnique({
          where: { email: user.email! },
        });

        if (!existingParent) {
          // Create parent on OAuth signup
          await prisma.parent.create({
            data: {
              email: user.email!,
              firstName: user.name?.split(' ')[0] || 'Parent',
              lastName: user.name?.split(' ')[1] || user.name || '',
              phone: '',
              password: '',
            },
          });
        }
      }

      return true;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
