import { prisma } from '../../../lib/prisma';

/** How many sessions each person has completed, in two grouped queries (one per seat). */
export async function completedSessionCounts(userIds: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const ids = [...userIds];
  const [asFirst, asSecond] = await Promise.all([
    prisma.session.groupBy({
      by: ['user1Id'],
      where: { status: 'COMPLETED', isSolo: false, user1Id: { in: ids } },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ['user2Id'],
      where: { status: 'COMPLETED', isSolo: false, user2Id: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  for (const row of asFirst) counts.set(row.user1Id, (counts.get(row.user1Id) ?? 0) + row._count._all);
  for (const row of asSecond) {
    if (row.user2Id) counts.set(row.user2Id, (counts.get(row.user2Id) ?? 0) + row._count._all);
  }
  return counts;
}
