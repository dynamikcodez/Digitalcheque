'use server';

import { prisma } from '../../lib/db';
import { getSessionUser } from '../../lib/supabase/server';

/**
 * Retrieves the cheques created by the currently signed-in user, filterable by status.
 */
export async function senderGetCheques(status?: string) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const where: any = { senderUserId: user.id };

  if (status && status !== 'all') {
    where.status = status;
  }

  return prisma.cheque.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Retrieves a single cheque owned by the currently signed-in user.
 */
export async function senderGetCheque(chequeId: string) {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const cheque = await prisma.cheque.findUnique({
    where: { id: chequeId },
    include: {
      transfers: true,
      payoutDestinations: true,
    },
  });

  if (!cheque) {
    throw new Error('Cheque not found');
  }

  if (cheque.senderUserId !== user.id) {
    throw new Error('You do not own this cheque');
  }

  return cheque;
}
