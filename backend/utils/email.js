import nodemailer from 'nodemailer';

const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

export const sendPasswordResetEmail = async ({ email, officeName, resetUrl }) => {
  if (!smtpConfigured()) return false;
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your NoQ password',
    text: `A password reset was requested for ${officeName}. Use this link within 30 minutes: ${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>A password reset was requested for <strong>${officeName}</strong>.</p><p><a href="${resetUrl}">Reset your NoQ password</a>. This link expires in 30 minutes and can be used once.</p><p>If you did not request this, ignore this email.</p>`,
  });
  return true;
};
