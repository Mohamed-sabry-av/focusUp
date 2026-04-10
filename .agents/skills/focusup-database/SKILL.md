---
name: focusup-database
description: "FocusUp Prisma schema, data models, migrations, query patterns, and indexing. Use when modifying schema, writing queries, adding models, or running migrations."
---

# FocusUp Database

## Prisma Configuration

- **Package:** `packages/db` (`@focusUp/db`)
- **Schema location:** `packages/db/prisma/schema/schema.prisma`
- **Generated client:** `packages/db/prisma/generated/`
- **Config:** `moduleFormat: "esm"`, `runtime: "bun"`, provider: `postgresql`

## Commands
```bash
bun run db:generate    # Generate Prisma client after schema changes
bun run db:push        # Push schema to DB (dev only, no migration file)
bun run db:migrate     # Create and apply migration (production-safe)
bun run db:studio      # Open Prisma Studio GUI
```

## Complete Data Models

### User
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String?
  displayName       String
  username          String    @unique
  avatarUrl         String?
  timezone          String    @default("UTC")
  categories        Category[]
  preferredLength   Int[]     @default([25, 50])
  calcomUserId      String?   @unique
  calcomUsername     String?
  stripeCustomerId  String?
  planTier          PlanTier  @default(FREE)
  strikeCount       Int       @default(0)
  isActive          Boolean   @default(true)
  isBanned          Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  sessionsAsUser1   Session[] @relation("User1Sessions")
  sessionsAsUser2   Session[] @relation("User2Sessions")
  reflections       Reflection[]
  reportsGiven      Report[]  @relation("Reporter")
  reportsReceived   Report[]  @relation("Reported")
  blocks            Block[]   @relation("Blocker")
  blockedBy         Block[]   @relation("Blocked")
}
```

### Session
```prisma
model Session {
  id              String        @id @default(cuid())
  user1Id         String
  user2Id         String?
  durationMin     Int           // 25 | 50 | 75
  status          SessionStatus @default(PENDING)
  scheduledAt     DateTime
  startedAt       DateTime?
  endedAt         DateTime?
  calcomBookingId String?       @unique
  livekitRoomName String        @unique
  category        Category?
  user1Goal       String?
  user2Goal       String?

  user1           User          @relation("User1Sessions", fields: [user1Id], references: [id])
  user2           User?         @relation("User2Sessions", fields: [user2Id], references: [id])
  reflections     Reflection[]
  reports         Report[]
  createdAt       DateTime      @default(now())

  @@index([status])
  @@index([scheduledAt])
  @@index([user1Id])
  @@index([user2Id])
}
```

### Supporting Models
```prisma
model Reflection {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String
  text        String
  rating      Int?     // 1–5 optional self-rating
  createdAt   DateTime @default(now())
  session     Session  @relation(fields: [sessionId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}

model Report {
  id          String       @id @default(cuid())
  reporterId  String
  reportedId  String
  sessionId   String?
  reason      ReportReason
  description String?
  status      ReportStatus @default(OPEN)
  createdAt   DateTime     @default(now())
  reporter    User         @relation("Reporter", fields: [reporterId], references: [id])
  reported    User         @relation("Reported", fields: [reportedId], references: [id])
  session     Session?     @relation(fields: [sessionId], references: [id])
}

model Block {
  id        String   @id @default(cuid())
  blockerId String
  blockedId String
  createdAt DateTime @default(now())
  blocker   User     @relation("Blocker", fields: [blockerId], references: [id])
  blocked   User     @relation("Blocked", fields: [blockedId], references: [id])
  @@unique([blockerId, blockedId])
}
```

### Enums
```prisma
enum SessionStatus { PENDING CONFIRMED ACTIVE COMPLETED CANCELLED NO_SHOW }
enum PlanTier      { FREE PRO TEAM }
enum Category      { CODING WRITING STUDYING DESIGN ADMIN OTHER }
enum ReportReason  { NO_SHOW INAPPROPRIATE HARASSMENT SPAM OTHER }
enum ReportStatus  { OPEN REVIEWED RESOLVED DISMISSED }
```

## Query Patterns

### ALWAYS: Try/Catch + Structured Errors
```typescript
try {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { user1: true, user2: true },
  });
  return session;
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      throw new ORPCError("NOT_FOUND", { message: "Session not found" });
    }
  }
  throw new ORPCError("INTERNAL_SERVER_ERROR");
}
```

### Bidirectional Block (Always Two Records)
```typescript
await prisma.$transaction([
  prisma.block.create({ data: { blockerId: userA, blockedId: userB } }),
  prisma.block.create({ data: { blockerId: userB, blockedId: userA } }),
]);
```

### Free Tier Check (3 Sessions/Week)
```typescript
const weekStart = startOfWeek(new Date());
const count = await prisma.session.count({
  where: {
    user1Id: userId,
    status: { not: "CANCELLED" },
    scheduledAt: { gte: weekStart },
  },
});
if (user.planTier === "FREE" && count >= 3) {
  throw new ORPCError("FORBIDDEN", { message: "Free tier limit reached" });
}
```

## Hard Rules
- NEVER run raw SQL — Prisma API only
- NEVER edit existing migration files — create new ones
- NEVER change enums without explicit user instruction
- Required indexes: `sessions.status`, `sessions.scheduledAt`, `sessions.user1Id`, `sessions.user2Id`
- Strikes are append-only — never decrement or delete
