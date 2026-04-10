import { prisma } from '../../../lib/prisma';
import { OnboardingInput } from '@focusUp/shared-types';

export class UsersService {
  static async updateOnboarding(userId: string, data: typeof OnboardingInput._type) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        timezone: data.timezone,
        categories: data.categories,
        preferredLength: data.preferredLength,
      },
    });

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}
