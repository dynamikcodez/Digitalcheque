import { prisma } from './db';
import { User as SupabaseUser } from '@supabase/supabase-js';

export async function ensureUserExists(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email!;
  const phone = supabaseUser.phone || (supabaseUser.user_metadata?.phone as string) || null;

  // Check if a user with this email already exists under a different ID
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let user;

  if (existingUser && existingUser.id !== supabaseUser.id) {
    // 1. Rename the old user's email to release the unique constraint
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: `old_mock_${Date.now()}_${existingUser.email}` },
    });

    // 2. Create the new user with the correct email, preserving the admin role
    user = await prisma.user.create({
      data: {
        id: supabaseUser.id,
        email,
        phone,
        role: existingUser.role,
      },
    });

    // 3. Re-link cheques to the new live user ID
    await prisma.cheque.updateMany({
      where: { senderUserId: existingUser.id },
      data: { senderUserId: supabaseUser.id },
    });

    // 4. Safely delete the old mock user record
    await prisma.user.delete({
      where: { id: existingUser.id },
    });
  } else {
    // Standard upsert if there is no email conflict
    user = await prisma.user.upsert({
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
  }

  return user;
}
