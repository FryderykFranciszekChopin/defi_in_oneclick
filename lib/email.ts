import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  // In development, log email config status
  if (process.env.NODE_ENV === 'development') {
    console.log('Email config:', {
      host: process.env.EMAIL_HOST,
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM,
      hasPassword: !!process.env.EMAIL_PASS
    });
  }

  // If email is not configured, return null
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env.local');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export async function sendOTPEmail(to: string, otp: string) {
  const transporter = createTransporter();
  
  // If email is not configured, log to console instead
  if (!transporter) {
    console.log('📧 Email OTP (Dev Mode):', {
      to,
      otp,
      message: 'Configure email in .env.local to send real emails'
    });
    return { success: true, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: 'Your OneClick DeFi Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">OneClick DeFi</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email</h2>
            <p style="color: #4b5563; margin-bottom: 30px;">
              Use the verification code below to complete your sign-in:
            </p>
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5; font-size: 36px; letter-spacing: 8px; margin: 0;">
                ${otp}
              </h1>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This code will expire in 5 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>© 2025 OneClick DeFi. Built with ❤️ by holostudio</p>
          </div>
        </div>
      `,
      text: `Your OneClick DeFi verification code is: ${otp}\n\nThis code will expire in 5 minutes.`,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
}

// Test email configuration
export async function testEmailConfig() {
  const transporter = createTransporter();
  
  if (!transporter) {
    return { success: false, error: 'Email not configured' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}