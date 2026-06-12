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
