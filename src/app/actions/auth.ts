'use server';

import { cookies } from 'next/headers';

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('mock-session-email');
  return { success: true };
}
