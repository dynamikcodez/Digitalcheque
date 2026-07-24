import { prisma } from './db';
import { User as SupabaseUser } from '@supabase/supabase-js';

export async function ensureUserExists(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email!;
  const phone = supabaseUser.phone || (supabaseUser.user_metadata?.phone as string) || null;

  // Upsert the user into the local database.
  // Note that we do not update 'role' on update, preserving admin status if promoted.
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
