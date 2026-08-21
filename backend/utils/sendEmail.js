import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendCompletionEmail = async ({ name, empId, trainingName, branch, email }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Brynex LMS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${trainingName} – Training Completed – Brynex LMS`,
    text: `Congratulations, ${name}!\n\nYou have successfully completed your training through Brynex LMS. Your commitment to learning and growth is truly appreciated. Keep up the great work and continue striving for excellence in your role.\n\nHere are your training completion details:\nEmployee Name: ${name}\nEmployee ID: ${empId}\nTraining Name: ${trainingName}\nBranch Name: ${branch}\n\nWarm regards,\nTeam Brynex`
  };

  await transporter.sendMail(mailOptions);
};

export const sendOtpEmail = async ({ email, otp }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`⚠️ [EMAIL] EMAIL_USER or EMAIL_PASS missing in environment variables. OTP generated for ${email} is: ${otp}`);
    return false;
  }

  const port = Number(process.env.EMAIL_PORT) || 465;
  const isSecure = port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: port,
      secure: isSecure, // true for 465, false for 587 or other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      ...(port === 587 ? { requireTLS: true } : {})
    });

    const mailOptions = {
      from: `"Brynex LMS Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Verification Code (OTP) – Brynex LMS`,
      text: `Hello,\n\nYour One-Time Password (OTP) for signup verification is: ${otp}\n\nThis code is valid for 5 minutes. Please do not share this code with anyone.\n\nWarm regards,\nBrynex LMS Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #111827; text-align: center;">Email Verification Code</h2>
          <p style="color: #4b5563; font-size: 14px;">Use the following OTP code to complete your registration. This code will expire in <strong>5 minutes</strong>.</p>
          <div style="background-color: #f3f4f6; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">If you did not request this OTP, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL SUCCESS] OTP email delivered to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ [EMAIL FAILURE] Could not send OTP email to ${email}:`, err.message || err);
    throw err;
  }
};
