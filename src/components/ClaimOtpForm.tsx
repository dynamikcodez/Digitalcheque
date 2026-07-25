'use client';

import React, { useState, useEffect } from 'react';
import { sendClaimOtp, verifyClaimOtp } from '../app/actions/recipient';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowRight, ShieldCheck, Clock, RefreshCw, MessageSquare } from 'lucide-react';

interface ClaimOtpFormProps {
  token: string;
  cheque: {
    senderName: string;
    amount: number;
    currency: string;
    message: string | null;
    maskedEmail: string;
  };
}

export default function ClaimOtpForm({ token, cheque }: ClaimOtpFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0); // 0: Show details & Send OTP button, 1: Enter OTP
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes countdown (300 seconds)
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step === 1 && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [step, timer]);

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await sendClaimOtp(token);
      if (res.success) {
        setStep(1);
        setTimer(300);
        setCanResend(false);
      } else {
        setError(res.error || 'Failed to send verification code. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setError('Network error sending verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyClaimOtp(token, otpCode);
      if (res.success) {
        router.push(`/claim/${token}/payout`);
      } else {
        setError(res.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError('Network error verifying code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border p-8 rounded-2xl shadow-xl space-y-6">
      {/* Cheque Masked Summary */}
      <div className="text-center space-y-4">
        <div>
          <span className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">You Received</span>
          <div className="text-4xl font-extrabold text-primary mt-1">
            {cheque.currency === 'NGN' ? '₦' : '$'}
            {cheque.amount.toLocaleString()}
          </div>
        </div>

        <div className="bg-secondary/45 rounded-xl p-4 text-sm space-y-2 text-left">
          <div>
            <span className="text-3xs text-muted-foreground uppercase font-semibold">From</span>
            <p className="font-semibold text-foreground">{cheque.senderName}</p>
          </div>
          {cheque.message && (
            <div>
              <span className="text-3xs text-muted-foreground uppercase font-semibold">Message</span>
              <p className="italic text-muted-foreground">"{cheque.message}"</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 text-center">
          {error}
        </div>
      )}

      {step === 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground text-center leading-normal">
            For security, you must verify ownership of the contact email associated with this cheque:{' '}
            <strong className="text-foreground">{cheque.maskedEmail}</strong>.
          </p>

          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="flex items-center justify-center w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending verification code...
              </>
            ) : (
              <>
                Verify via Email OTP
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="space-y-2 text-center">
            <label htmlFor="otp" className="text-sm font-semibold block">
              Enter 6-Digit Code
            </label>
            <p className="text-3xs text-muted-foreground">
              We sent a code to your registered email <strong className="text-foreground">{cheque.maskedEmail}</strong>.
            </p>
            
            <input
              id="otp"
              type="text"
              required
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              disabled={loading}
              className="mt-2 block w-full text-center h-12 rounded-xl border border-input bg-transparent text-xl font-bold tracking-[8px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Code Timer & Resend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Code expires in: <strong className="ml-1 text-foreground">{formatTime(timer)}</strong>
            </span>

            <button
              type="button"
              disabled={!canResend || loading}
              onClick={handleSendOtp}
              className="text-primary font-semibold flex items-center hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Resend Code
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="flex items-center justify-center w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying code...
              </>
            ) : (
              <>
                Confirm Code & Proceed
                <ShieldCheck className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
