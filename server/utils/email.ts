import nodemailer from 'nodemailer';

// Create reusable transporter with environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: 'smtp.gmail.com', // Add explicit host for Gmail
  port: 587, // Use TLS port
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('Email service is ready');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    return false;
  }
}

export async function sendShiftAssignmentEmail(
  userEmail: string,
  shiftDetails: {
    shiftType: { name: string; startTime: string; endTime: string };
    week: string;
  }
): Promise<boolean> {
  const subject = 'New Shift Assignment';
  const html = `
    <h2>New Shift Assignment</h2>
    <p>You have been assigned to a new shift:</p>
    <ul>
      <li>Shift: ${shiftDetails.shiftType.name}</li>
      <li>Time: ${shiftDetails.shiftType.startTime} - ${shiftDetails.shiftType.endTime}</li>
      <li>Week: ${shiftDetails.week}</li>
    </ul>
  `;

  return sendEmail(userEmail, subject, html);
}