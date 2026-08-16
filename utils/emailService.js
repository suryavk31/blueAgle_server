const nodemailer = require('nodemailer');

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

if (isConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Send an admin invitation email.
 * Falls back to console logging if SMTP is not configured.
 */
const sendInvitationEmail = async ({ to, inviterName, roleName, acceptUrl, message }) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: #1a1a4e; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">BlueAgle Admin Portal</h1>
          <p style="color: #a5b4fc; margin: 8px 0 0;">You're Invited</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1a1a4e; margin-top: 0;">Admin Invitation</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join the <strong>BlueAgle Admin Panel</strong>
            as a <strong>${roleName}</strong>.
          </p>
          ${message ? `<blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding: 12px 16px; color: #555; background: #f8f7ff; border-radius: 0 8px 8px 0;">${message}</blockquote>` : ''}
          <p style="color: #555; line-height: 1.6;">Click the button below to accept your invitation and set your password. This link expires in <strong>48 hours</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${acceptUrl}" style="background: #1a1a4e; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
            <br/>This link will expire automatically after 48 hours.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    if (!isConfigured) {
        console.log('\n============================================================');
        console.log('[EMAIL SERVICE] SMTP not configured — Invitation details:');
        console.log(`  To: ${to}`);
        console.log(`  Role: ${roleName}`);
        console.log(`  Accept URL: ${acceptUrl}`);
        console.log('============================================================\n');
        return;
    }

    await transporter.sendMail({
        from: `"BlueAgle Admin" <${process.env.SMTP_FROM}>`,
        to,
        subject: `You're invited to BlueAgle Admin Panel as ${roleName}`,
        html,
    });
};

/**
 * Send password reset email.
 */
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: #1a1a4e; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">BlueAgle Admin Portal</h1>
          <p style="color: #a5b4fc; margin: 8px 0 0;">Password Reset</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1a1a4e; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #555; line-height: 1.6;">
            We received a request to reset your admin password. Click the button below to set a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #dc2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this, please ignore this email. Your password won't change.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    if (!isConfigured) {
        console.log('\n============================================================');
        console.log('[EMAIL SERVICE] SMTP not configured — Password Reset details:');
        console.log(`  To: ${to}`);
        console.log(`  Reset URL: ${resetUrl}`);
        console.log('============================================================\n');
        return;
    }

    await transporter.sendMail({
        from: `"BlueAgle Admin" <${process.env.SMTP_FROM}>`,
        to,
        subject: 'Reset your BlueAgle Admin password',
        html,
    });
};

/**
 * Send Account Deletion Confirmation Email.
 */
const sendAccountDeletionEmail = async ({ to, userName, deletedAt }) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: #1a1a4e; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">BlueAgle</h1>
          <p style="color: #fca5a5; margin: 8px 0 0;">Account Deletion Confirmation</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1a1a4e; margin-top: 0;">Account Deleted Successfully</h2>
          <p style="color: #555; line-height: 1.6;">
            Hello <strong>${userName || 'Customer'}</strong>,
          </p>
          <p style="color: #555; line-height: 1.6;">
            This email confirms that your BlueAgle account (<strong>${to}</strong>) and personal data have been permanently deleted on <strong>${new Date(deletedAt).toLocaleString()}</strong>.
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
              <strong>Data Retention Notice:</strong> Non-personal order history and transaction records have been anonymized and retained solely for legal, accounting, and tax compliance requirements.
            </p>
          </div>
          <p style="color: #555; line-height: 1.6;">
            If you did not request this deletion or believe this was an error, please contact our support team immediately at <a href="mailto:support@blueeagle.com" style="color: #6366f1;">support@blueeagle.com</a>.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
            BlueAgle Privacy & Security Team
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    if (!isConfigured) {
        console.log('\n============================================================');
        console.log('[EMAIL SERVICE] SMTP not configured — Account Deletion details:');
        console.log(`  To: ${to}`);
        console.log(`  Timestamp: ${deletedAt}`);
        console.log('============================================================\n');
        return;
    }

    await transporter.sendMail({
        from: `"BlueAgle Security" <${process.env.SMTP_FROM}>`,
        to,
        subject: 'Your BlueAgle Account Has Been Permanently Deleted',
        html,
    });
};

module.exports = { sendInvitationEmail, sendPasswordResetEmail, sendAccountDeletionEmail };
