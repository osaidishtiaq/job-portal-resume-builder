const nodemailer = require('nodemailer');

/**
 * Build a Nodemailer transporter from environment variables.
 * If required SMTP variables are missing, returns null – caller should skip sending.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  // All required fields must be present to create a usable transporter
  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  // Determine if the connection should be secure (TLS) – port 465 is implicit TLS, 587 uses STARTTLS
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Timeout settings to avoid hanging the request (ms)
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    // Do not log credentials
    logger: false,
    debug: false
  });
}

/**
 * Send a plain‑text notification to the employer when a new application arrives.
 *
 * @param {Object} params
 * @param {string} params.employerEmail - Destination email address of the employer.
 * @param {string} params.employerName  - (optional) name of the employer for personalization.
 * @param {string} params.jobTitle      - Title of the job the candidate applied to.
 * @param {string} params.candidateName - Name of the candidate who applied.
 * @param {string} params.applicationId - Application document id (for reference).
 */
async function sendApplicationNotification({ employerEmail, employerName, jobTitle, candidateName, applicationId }) {
  const transporter = getTransporter();
  if (!transporter) {
    // SMTP not configured – silently ignore.
    return;
  }

  const from = process.env.SMTP_FROM;
  const subject = `New application for "${jobTitle}"`;
  const text = `Hello${employerName ? ' ' + employerName : ''},\n\n` +
    `A candidate has applied for your job posting "${jobTitle}".\n` +
    `Candidate: ${candidateName}\n` +
    `Application ID: ${applicationId}\n\n` +
    `You can review applications via the employer dashboard at /employer/jobs/${applicationId}\n\n` +
    `Best regards,\nJob Portal System`;

  const mailOptions = {
    from,
    to: employerEmail,
    subject,
    text
  };

  // Send mail – any error is propagated to caller so they can handle it.
  await transporter.sendMail(mailOptions);
}

module.exports = { sendApplicationNotification };
