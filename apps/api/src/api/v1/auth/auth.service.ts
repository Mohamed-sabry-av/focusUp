import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../utils/errors';
import { RegisterInput, LoginInput } from '@focusUp/shared-types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class AuthService {
  static async sendVerificationEmail(userId: string, email: string): Promise<string> {
    const token = jwt.sign({ userId, email, purpose: 'email-verification' }, JWT_SECRET, {
      expiresIn: '24h',
    });

    console.log(`Verification URL: ${FRONTEND_URL}/verify-email?token=${token}`);
    return token;
  }

  static async verifyEmail(token: string) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      
      if (payload.purpose !== 'email-verification') {
        throw new AppError('Invalid verification token', 400);
      }

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.emailVerified) {
        return user;
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      return updatedUser;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (error?.name === 'TokenExpiredError') {
        throw new AppError('Verification link expired', 400);
      }
      throw new AppError('Invalid verification token', 400);
    }
  }

  static async resendVerification(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    return this.sendVerificationEmail(user.id, user.email);
  }

  static async register(data: RegisterInput) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    
    if (existingEmail) {
      throw new AppError('Email is already registered', 409);
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    
    if (existingUsername) {
      throw new AppError('Username is already taken', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        username: data.username,
        emailVerified: false,
      },
    });

    const token = await this.sendVerificationEmail(user.id, user.email);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, verificationToken: token };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('Invalid email or password', 401);

    if (!user.passwordHash) throw new AppError('Invalid email or password', 401);
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) throw new AppError('Invalid email or password', 401);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
