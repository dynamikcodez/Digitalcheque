import { prisma } from './db';
import { User as SupabaseUser } from '@supabase/supabase-js';

export async function ensureUserExists(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email!;
  const phone = supabaseUser.phone || (supabaseUser.user_metadata?.phone as string) || null;

  // Check if a user with this email already exists under a different ID
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.id !== supabaseUser.id) {
    // Re-link any existing cheques from the old ID (like mock_user_...) to the new Supabase ID
    await prisma.cheque.updateMany({
      where: { senderUserId: existingUser.id },
      data: { senderUserId: supabaseUser.id },
    });

    // Delete the old user record to release the email constraint
    await prisma.user.delete({
      where: { id: existingUser.id },
    });
  }

  // Upsert the user into the local database
  const user = await prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email,
      phone,
    },
    create: {
      id: supabaseUser.id,
      email,
      phone,
      role: 'user',
    },
  });

  return user;
}
