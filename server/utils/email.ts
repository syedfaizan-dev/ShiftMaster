import nodemailer from 'nodemailer';

// Create a simple transporter with environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail', 'outlook', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
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