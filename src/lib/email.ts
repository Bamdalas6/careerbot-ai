import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const FROM = process.env.RESEND_FROM_EMAIL || 'CareerBot AI <onboarding@resend.dev>';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://careerbot-ai-seven.vercel.app';

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${SITE}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(toEmail.trim())}`;
  const year = new Date().getFullYear();
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: [toEmail],
      subject: 'Reset your CareerBot AI password',
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center"><table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;"><tr><td style="background:#09090b;padding:32px 40px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">CareerBot AI</h1></td></tr><tr><td style="padding:40px;"><h2 style="margin:0 0 12px;color:#09090b;font-size:20px;font-weight:700;">Reset your password</h2><p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">Hi <strong>${userName}</strong>, click below to reset your password. This link expires in <strong>15 minutes</strong>.</p><table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding-bottom:28px;"><a href="${resetUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;">Reset Password</a></td></tr></table><p style="margin:0 0 6px;color:#52525b;font-size:13px;">Or paste in your browser:</p><p style="margin:0 0 24px;word-break:break-all;color:#3b82f6;font-size:12px;">${resetUrl}</p><div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px 16px;"><p style="margin:0;color:#713f12;font-size:12px;">&#128274; If you didn't request this, ignore this email. Your password won't change.</p></div></td></tr><tr><td style="background:#f4f4f5;padding:20px 40px;text-align:center;border-top:1px solid #e4e4e7;"><p style="margin:0;color:#71717a;font-size:12px;">&copy; ${year} CareerBot AI &middot; ${toEmail}</p></td></tr></table></td></tr></table></body></html>`,
      text: `Reset your CareerBot AI password\n\nHi ${userName},\n\nReset link (expires in 15 min):\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\n© ${year} CareerBot AI`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Email failed';
    console.error('sendPasswordResetEmail:', msg);
    return { success: false, error: msg };
  }
}

export async function sendReferralSuccessEmail(
  referrerEmail: string,
  referrerName: string,
  friendName: string,
  tokensEarned: number,
  totalEarned: number
): Promise<void> {
  const dashUrl = `${SITE}/settings?tab=referrals`;
  const year = new Date().getFullYear();
  try {
    await resend.emails.send({
      from: FROM,
      to: [referrerEmail],
      subject: `You earned ${tokensEarned} free tokens on CareerBot AI!`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center"><table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;"><tr><td style="background:#09090b;padding:32px 40px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">CareerBot AI</h1></td></tr><tr><td style="padding:40px;text-align:center;"><p style="font-size:48px;margin:0 0 12px;">&#127881;</p><h2 style="margin:0 0 8px;color:#09090b;font-size:20px;font-weight:700;">You earned ${tokensEarned} free tokens!</h2><p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">Hi <strong>${referrerName}</strong>, <strong>${friendName}</strong> just joined using your referral link. We added <strong>${tokensEarned} tokens</strong> to your account.</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:left;"><p style="margin:0;color:#166534;font-size:14px;font-weight:600;">Tokens earned: +${tokensEarned}</p><p style="margin:4px 0 0;color:#166534;font-size:13px;">Total lifetime: ${totalEarned} tokens</p></div><a href="${dashUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">View Referrals</a></td></tr><tr><td style="background:#f4f4f5;padding:20px;text-align:center;border-top:1px solid #e4e4e7;"><p style="margin:0;color:#71717a;font-size:12px;">&copy; ${year} CareerBot AI</p></td></tr></table></td></tr></table></body></html>`,
    });
  } catch (err) {
    console.warn('Referral notification email error (non-critical):', err);
  }
}
