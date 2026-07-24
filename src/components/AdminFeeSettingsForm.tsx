'use client';

import React, { useState } from 'react';
import { adminUpdatePlatformSettings } from '../app/actions/admin';
import { Settings, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FeeSettingsProps {
  initialPercentage: number;
  initialFixed: number;
}

export default function AdminFeeSettingsForm({ initialPercentage, initialFixed }: FeeSettingsProps) {
  const [feePercentage, setFeePercentage] = useState(initialPercentage);
  const [feeFixed, setFeeFixed] = useState(initialFixed);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      await adminUpdatePlatformSettings({
        feePercentage,
        feeFixed,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update fee settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 max-w-lg">
      <div className="flex items-center space-x-2 border-b border-border pb-3">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Adjust Platform Fees</h3>
      </div>

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 text-sm rounded-xl p-3 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Platform fee configurations updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="percentage" className="text-xs font-semibold uppercase text-muted-foreground">
            Platform Fee Percentage (%)
          </label>
          <input
            id="percentage"
            type="number"
            step="0.1"
            min="0"
            max="100"
            required
            value={feePercentage}
            onChange={(e) => setFeePercentage(Number(e.target.value))}
            disabled={loading}
            className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="fixed" className="text-xs font-semibold uppercase text-muted-foreground">
            Platform Fixed Fee (₦)
          </label>
          <input
            id="fixed"
            type="number"
            min="0"
            required
            value={feeFixed}
            onChange={(e) => setFeeFixed(Number(e.target.value))}
            disabled={loading}
            className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center h-10 px-5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Saving configurations...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </form>
    </div>
  );
}
