export declare class SessionsService {
    /**
     * Fetch a session by ID, including user1 and user2 relations.
     */
    static getSessionById(sessionId: string): Promise<{
        user1: {
            id: string;
            email: string;
            passwordHash: string | null;
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
        };
        user2: {
            id: string;
            email: string;
            passwordHash: string | null;
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        user1Id: string;
        user2Id: string | null;
        durationMin: number;
        status: import("@prisma/client").$Enums.SessionStatus;
        scheduledAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
        livekitRoomName: string;
        category: import("@prisma/client").$Enums.Category | null;
        user1Goal: string | null;
        user2Goal: string | null;
    }>;
    /**
     * Generate a LiveKit access token for a participant to join a session room.
     * Validates that the user is a participant and the session is joinable.
     */
    static generateLivekitToken(sessionId: string, userId: string): Promise<{
        token: string;
    }>;
    /**
     * Set a goal for the authenticated user in a session.
     * Updates user1Goal or user2Goal depending on which participant is setting the goal.
     */
    static setGoal(sessionId: string, userId: string, goal: string): Promise<{
        id: string;
        createdAt: Date;
        user1Id: string;
        user2Id: string | null;
        durationMin: number;
        status: import("@prisma/client").$Enums.SessionStatus;
        scheduledAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
        livekitRoomName: string;
        category: import("@prisma/client").$Enums.Category | null;
        user1Goal: string | null;
        user2Goal: string | null;
    }>;
    /**
     * Join a session. Sets status to ACTIVE when both users join.
     */
    static joinSession(sessionId: string, userId: string): Promise<{
        session: {
            id: string;
            createdAt: Date;
            user1Id: string;
            user2Id: string | null;
            durationMin: number;
            status: import("@prisma/client").$Enums.SessionStatus;
            scheduledAt: Date;
            startedAt: Date | null;
            endedAt: Date | null;
            livekitRoomName: string;
            category: import("@prisma/client").$Enums.Category | null;
            user1Goal: string | null;
            user2Goal: string | null;
        };
        isActive: boolean;
    }>;
    /**
     * Complete an active session. Updates status and endedAt.
     */
    static completeSession(sessionId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        user1Id: string;
        user2Id: string | null;
        durationMin: number;
        status: import("@prisma/client").$Enums.SessionStatus;
        scheduledAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
        livekitRoomName: string;
        category: import("@prisma/client").$Enums.Category | null;
        user1Goal: string | null;
        user2Goal: string | null;
    }>;
    /**
     * Fetch current session status logic
     */
    static getSessionStatus(sessionId: string, userId: string): Promise<{
        user1: {
            id: string;
            email: string;
            passwordHash: string | null;
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
        };
        user2: {
            id: string;
            email: string;
            passwordHash: string | null;
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        user1Id: string;
        user2Id: string | null;
        durationMin: number;
        status: import("@prisma/client").$Enums.SessionStatus;
        scheduledAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
        livekitRoomName: string;
        category: import("@prisma/client").$Enums.Category | null;
        user1Goal: string | null;
        user2Goal: string | null;
    }>;
    /**
     * Create a reflection for a completed session.
     */
    static createReflection(data: {
        sessionId: string;
        userId: string;
        text: string;
        rating?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        sessionId: string;
        userId: string;
        text: string;
        rating: number | null;
    }>;
    /**
     * Fetch upcoming sessions for the user within the next 7 days.
     */
    static getUpcomingSessions(userId: string): Promise<{
        partner: {
            id: string;
            displayName: string;
            username: string;
            avatarUrl: string | null;
        } | null;
        user1: {
            id: string;
            displayName: string;
            username: string;
            avatarUrl: string | null;
        };
        user2: {
            id: string;
            displayName: string;
            username: string;
            avatarUrl: string | null;
        } | null;
        id: string;
        createdAt: Date;
        user1Id: string;
        user2Id: string | null;
        durationMin: number;
        status: import("@prisma/client").$Enums.SessionStatus;
        scheduledAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
        livekitRoomName: string;
        category: import("@prisma/client").$Enums.Category | null;
        user1Goal: string | null;
        user2Goal: string | null;
    }[]>;
    /**
     * Fetch session history with pagination.
     */
    static getSessionHistory(userId: string, page?: number, limit?: number): Promise<{
        data: {
            partner: any;
            reflectionSnippet: string | null;
            reflections: undefined;
            id: string;
            createdAt: Date;
            user1Id: string;
            user2Id: string | null;
            durationMin: number;
            status: import("@prisma/client").$Enums.SessionStatus;
            scheduledAt: Date;
            startedAt: Date | null;
            endedAt: Date | null;
            livekitRoomName: string;
            category: import("@prisma/client").$Enums.Category | null;
            user1Goal: string | null;
            user2Goal: string | null;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
}
