import { OnboardingInput } from '@focusUp/shared-types';
export declare class UsersService {
    private static getStartOfWeek;
    private static getEndOfWeek;
    private static getStartOfDay;
    static getCurrentUser(userId: string): Promise<{
        id: string;
        email: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
        timezone: string;
        categories: import("@prisma/client").$Enums.Category[];
        preferredLength: number[];
        stripeCustomerId: string | null;
        planTier: import("@prisma/client").$Enums.PlanTier;
        strikeCount: number;
        isActive: boolean;
        isBanned: boolean;
        emailVerified: boolean;
        isAdmin: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static getUserStats(userId: string): Promise<{
        sessionsThisWeek: number;
        focusHoursThisWeek: number;
        currentStreak: number;
        sessionsUsedThisWeek: number;
        sessionLimit: number | null;
        planTier: import("@prisma/client").$Enums.PlanTier;
    }>;
    static updateOnboarding(userId: string, data: typeof OnboardingInput._type): Promise<{
        id: string;
        email: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
        timezone: string;
        categories: import("@prisma/client").$Enums.Category[];
        preferredLength: number[];
        stripeCustomerId: string | null;
        planTier: import("@prisma/client").$Enums.PlanTier;
        strikeCount: number;
        isActive: boolean;
        isBanned: boolean;
        emailVerified: boolean;
        isAdmin: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
