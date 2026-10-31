const nodemailer = require('nodemailer');
const https = require('https');

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
  // Enforce STARTTLS for typical submission port 587
  const requireTLS = port === 587;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: { user, pass },
    // Timeout settings to avoid hanging the request (ms)
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    // Do not log credentials
    logger: false,
    debug: false
  });
}

// Brevo transactional email helper
function sendViaBrevo({ to, subject, text, html }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return reject(new Error('BREVO_API_KEY not set'));
    }
    const payload = {
      sender: { email: process.env.SMTP_FROM },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    };
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          let errMsg = `Brevo API error ${res.statusCode}`;
          try {
            const parsed = JSON.parse(body);
            if (parsed.code) errMsg += `: ${parsed.code}`;
          } catch (_) {}
          reject(new Error(errMsg));
        }
      });
    });
    // 15‑second timeout – abort request on timeout
    req.setTimeout(15000, () => {
      req.destroy(new Error('Brevo request timeout'));
    });
    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
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
  const from = process.env.SMTP_FROM;
  const subject = `New application for "${jobTitle}"`;
  const text = `Hello${employerName ? ' ' + employerName : ''},\n\n` +
    `A candidate has applied for your job posting "${jobTitle}".\n` +
    `Candidate: ${candidateName}\n` +
    `Application ID: ${applicationId}\n\n` +
    `You can review applications via the employer dashboard at /employer/jobs/${applicationId}\n\n` +
    `Best regards,\nJob Portal System`;

  // Prefer Brevo API if configured
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to: employerEmail, subject, text, html: undefined });
    return;
  }

  if (!transporter) {
    // SMTP not configured – silently ignore.
    return;
  }

  const mailOptions = { from, to: employerEmail, subject, text };
  await transporter.sendMail(mailOptions);
}

/**
 * Send a password reset email with the secure reset URL.
 * Throws an error if neither SMTP nor Brevo API is configured or if email delivery fails.
 *
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.userName - (optional) Name of the user.
 * @param {string} params.resetUrl - Full reset URL with token.
 * @param {number} [params.expiresInMinutes=20] - Minutes until token expires.
 */
async function sendPasswordResetEmail({ toEmail, userName, resetUrl, expiresInMinutes = 20 }) {
  const transporter = getTransporter();
  if (!transporter && !process.env.BREVO_API_KEY) {
    throw new Error('SMTP credentials missing');
  }

  const from = process.env.SMTP_FROM;
  const subject = 'Password Reset Request - Job Portal';
  const text = `Hello${userName ? ' ' + userName : ''},\n\n` +
    `You are receiving this email because you (or someone else) requested a password reset for your account.\n\n` +
    `Please visit the following link to reset your password:\n` +
    `${resetUrl}\n\n` +
    `This link will expire in ${expiresInMinutes} minutes.\n\n` +
    `If you did not request this, please ignore this email and your password will remain unchanged.\n\n` +
    `Best regards,\nJob Portal Security Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hello${userName ? ' ' + userName : ''},</p>
      <p>You are receiving this email because a password reset was requested for your account.</p>
      <div style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 0.9em;">This link will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p style="color: #666; font-size: 0.85em; word-break: break-all;">If the button above does not work, paste this URL into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 0.8em;">If you did not request this password reset, please ignore this email and your password will remain secure.</p>
    </div>
  `;

  // Prefer Brevo API if configured
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo({ to: toEmail, subject, text, html });
    return;
  }

  if (!transporter) {
    throw new Error('Email service is not configured (SMTP credentials missing)');
  }

  const mailOptions = { from, to: toEmail, subject, text, html };
  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendApplicationNotification,
  sendPasswordResetEmail,
  getTransporter
};
