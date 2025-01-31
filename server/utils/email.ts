import nodemailer from 'nodemailer';

// Log SMTP configuration (excluding sensitive data)
console.log('Initializing SMTP with config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    // Not logging password for security
  }
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtppro.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  try {
    console.log('Attempting to send email:', {
      to,
      subject,
      from: process.env.SMTP_FROM
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}

export function sendShiftAssignmentEmail(userEmail: string, shiftDetails: any) {
  console.log('Preparing shift assignment email for:', userEmail, 'with details:', shiftDetails);

  const subject = 'New Shift Assignment';
  const html = `
    <h2>You have been assigned to a new shift</h2>
    <p>Dear team member,</p>
    <p>You have been assigned to a new shift. Here are the details:</p>
    <ul>
      <li><strong>Shift Type:</strong> ${shiftDetails.shiftType?.name || 'N/A'}</li>
      <li><strong>Time:</strong> ${shiftDetails.shiftType?.startTime || 'N/A'} - ${shiftDetails.shiftType?.endTime || 'N/A'}</li>
      <li><strong>Week:</strong> ${shiftDetails.week}</li>
    </ul>
    <p>Please log in to the system to view more details.</p>
    <br/>
    <p>Best regards,<br/>Workforce Management System</p>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    text: 'New Shift Assignment',
    html,
  });
}