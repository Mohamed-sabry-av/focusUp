import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found from Google profile'), false);
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return done(null, existingUser);
        }

        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '-');
        let username = baseUsername;

        let isCollision = await prisma.user.findUnique({ where: { username } });
        while (isCollision) {
          const suffix = Math.floor(1000 + Math.random() * 9000).toString();
          username = `${baseUsername}-${suffix}`;
          isCollision = await prisma.user.findUnique({ where: { username } });
        }

        const newUser = await prisma.user.create({
          data: {
            email,
            displayName: profile.displayName || email.split('@')[0],
            username,
            passwordHash: null,
            emailVerified: true,
            avatarUrl: profile.photos?.[0]?.value || null,
          },
        });

        done(null, newUser);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

export default passport;
