import { Resend } from 'resend';
import { prisma } from './db';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

// Default "from" email address (in test mode, Resend permits sending only to your registered account or from onboarding@resend.dev)
const EMAIL_FROM = 'onboarding@resend.dev';

async function logNotification(
  chequeId: string,
  recipientContact: string,
  type: 'claimed' | 'settled' | 'expiring' | 'claim_link' | 'otp',
  status: 'sent' | 'failed'
) {
  try {
    await prisma.notificationsLog.create({
      data: {
        chequeId,
        recipientContact,
        channel: 'email',
        type: type === 'claim_link' || type === 'otp' ? 'expiring' : type, // map minor types to required DB type schema constraints
        status,
      },
    });
  } catch (err) {
    console.error('Error logging notification to database:', err);
  }
}

export const emailService = {
  /**
   * Sends the claim link email to the recipient
   */
  async sendClaimLink(
    chequeId: string,
    recipientEmail: string,
    senderName: string,
    amount: number,
    message: string,
    claimToken: string
  ): Promise<boolean> {
    const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/claim/${claimToken}`;
    
    try {
      await resend.emails.send({
        from: `Digital Cheque <${EMAIL_FROM}>`,
        to: recipientEmail,
        subject: `You received ₦${amount.toLocaleString()} from ${senderName}!`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #2563eb;">You've received a Digital Cheque!</h2>
            <p><strong>${senderName}</strong> has sent you a Digital Cheque worth <strong>₦${amount.toLocaleString()}</strong>.</p>
            ${message ? `<blockquote style="background-color: #f3f4f6; padding: 12px; border-left: 4px solid #3b82f6; margin: 15px 0;">"${message}"</blockquote>` : ''}
            <p style="margin-top: 25px;">You can claim this money directly into your bank account without signing up or creating an account.</p>
            <div style="margin: 30px 0;">
              <a href="${claimUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Claim Your Cheque</a>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 40px;">If the button doesn't work, copy and paste this link into your browser: <br/> ${claimUrl}</p>
          </div>
        `,
      });

      await logNotification(chequeId, recipientEmail, 'claim_link', 'sent');
      return true;
    } catch (error) {
      console.error('Failed to send claim link email:', error);
      await logNotification(chequeId, recipientEmail, 'claim_link', 'failed');
      return false;
    }
  },

  /**
   * Sends the OTP verification code to the recipient
   */
  async sendOtp(
    chequeId: string,
    recipientEmail: string,
    senderName: string,
    amount: number,
    otpCode: string
  ): Promise<boolean> {
    try {
      await resend.emails.send({
        from: `Digital Cheque <${EMAIL_FROM}>`,
        to: recipientEmail,
        subject: `Verification Code: Claim your ₦${amount.toLocaleString()} cheque`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #2563eb;">Confirm Your Identity</h2>
            <p>You are attempting to claim a Digital Cheque of <strong>₦${amount.toLocaleString()}</strong> sent by ${senderName}.</p>
            <p>Please use the following 6-digit verification code to confirm your email address:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 25px 0; color: #1e3a8a;">
              ${otpCode}
            </div>
            <p style="color: #ef4444; font-size: 14px;">This code is only valid for 5 minutes. Do not share this code with anyone.</p>
          </div>
        `,
      });

      await logNotification(chequeId, recipientEmail, 'otp', 'sent');
      return true;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      await logNotification(chequeId, recipientEmail, 'otp', 'failed');
      return false;
    }
  },

  /**
   * Sends "claimed" notification email to the sender
   */
  async sendClaimedNotification(
    chequeId: string,
    senderEmail: string,
    recipientName: string,
    amount: number
  ): Promise<boolean> {
    try {
      await resend.emails.send({
        from: `Digital Cheque <${EMAIL_FROM}>`,
        to: senderEmail,
        subject: `Claim started: ₦${amount.toLocaleString()} Cheque`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #10b981;">Claim Process Started!</h2>
            <p>Hello,</p>
            <p><strong>${recipientName}</strong> has started claiming your Digital Cheque worth <strong>₦${amount.toLocaleString()}</strong>.</p>
            <p>They are currently setting up their payout bank account. We will notify you as soon as the funds are settled and paid out.</p>
            <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">Thank you for using Digital Cheque.</p>
          </div>
        `,
      });

      await logNotification(chequeId, senderEmail, 'claimed', 'sent');
      return true;
    } catch (error) {
      console.error('Failed to send claimed notification email:', error);
      await logNotification(chequeId, senderEmail, 'claimed', 'failed');
      return false;
    }
  },

  /**
   * Sends "settled" notification email to the sender
   */
  async sendSettledNotification(
    chequeId: string,
    senderEmail: string,
    recipientName: string,
    amount: number
  ): Promise<boolean> {
    try {
      await resend.emails.send({
        from: `Digital Cheque <${EMAIL_FROM}>`,
        to: senderEmail,
        subject: `Cheque Settled: ₦${amount.toLocaleString()} Paid Out`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #059669;">Digital Cheque Settled!</h2>
            <p>Hello,</p>
            <p>Your Digital Cheque of <strong>₦${amount.toLocaleString()}</strong> has been successfully claimed and paid out to <strong>${recipientName}</strong>.</p>
            <p>The transfer has been settled by our payment processor and the recipient will see the credit in their bank account shortly.</p>
            <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">Thank you for using Digital Cheque.</p>
          </div>
        `,
      });

      await logNotification(chequeId, senderEmail, 'settled', 'sent');
      return true;
    } catch (error) {
      console.error('Failed to send settled notification email:', error);
      await logNotification(chequeId, senderEmail, 'settled', 'failed');
      return false;
    }
  },
};
