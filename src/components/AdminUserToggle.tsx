'use client';

import React, { useState } from 'react';
import { adminToggleUserRole } from '../app/actions/admin';
import { Shield, ShieldAlert, Loader2 } from 'lucide-react';

interface UserToggleProps {
  userId: string;
  currentRole: string;
}

export default function AdminUserToggle({ userId, currentRole }: UserToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await adminToggleUserRole(userId);
    } catch (err) {
      console.error(err);
      alert('Failed to toggle user role.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentRole === 'admin';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
        isAdmin
          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400'
      } disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
      ) : isAdmin ? (
        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
      ) : (
        <Shield className="w-3.5 h-3.5 mr-1.5" />
      )}
      {isAdmin ? 'Demote to User' : 'Promote to Admin'}
    </button>
  );
}
