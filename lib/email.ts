import nodemailer from "nodemailer";

// ─── SMTP Config ─────────────────────────────────────────────────────────────
const smtpHost     = process.env.SMTP_HOST;
const smtpPort     = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser     = process.env.SMTP_USER;
const smtpPass     = process.env.SMTP_PASS;
const fromEmail    = process.env.SMTP_FROM_EMAIL || "no-reply@optcamp.com";
const fromName     = process.env.SMTP_FROM_NAME  || "OptCamp";
const appUrl       = process.env.NEXT_PUBLIC_APP_URL || "https://optcamp.com";
const isProduction = process.env.NODE_ENV === "production";

/** True when all required SMTP env vars are present */
const smtpConfigured = !!(smtpHost && smtpUser && smtpPass);

// Only create a transporter when SMTP is configured — avoids nodemailer
// throwing at module-init time when credentials are missing.
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

// ─── Base HTML Template ───────────────────────────────────────────────────────
function getBaseTemplate(title: string, preheader: string, content: string, cta?: { text: string; url: string }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #000000;
      color: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 48px; }
    .logo { font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff; text-decoration: none; }
    .content { background-color: #0a0a0a; border: 1px solid #222222; border-radius: 12px; padding: 40px; }
    .title { font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 24px; color: #ffffff; letter-spacing: -0.02em; }
    p { font-size: 15px; line-height: 1.6; color: #a3a3a3; margin-top: 0; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #ffffff; color: #000000; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 8px; margin-bottom: 8px; }
    .footer { margin-top: 48px; font-size: 13px; color: #525252; text-align: center; }
    .divider { height: 1px; background-color: #222222; margin: 32px 0; }
  </style>
</head>
<body>
  <span style="display:none;font-size:1px;color:#000000;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>
  <div class="container">
    <div class="header">
      <a href="${appUrl}" class="logo">OptCamp</a>
    </div>
    <div class="content">
      <h1 class="title">${title}</h1>
      ${content}
      ${cta ? `<div style="margin-top: 32px;"><a href="${cta.url}" class="button">${cta.text}</a></div>` : ''}
    </div>
    <div class="footer">
      <p style="color: #525252; margin-bottom: 8px;">OptCamp Cohort Operating System</p>
      <p style="color: #525252; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── Core send helper (non-OTP emails) ───────────────────────────────────────
async function sendMail(to: string, subject: string, html: string) {
  if (!smtpConfigured) {
    if (!isProduction) {
      // Dev: log but don't expose OTP (OTPs go through sendOtpEmail instead)
      console.log(`\n[OptCamp] DEV EMAIL — NOT sent via SMTP`);
      console.log(`  To:      ${to}`);
      console.log(`  Subject: ${subject}\n`);
      return;
    } else {
      // Production without SMTP: throw so the caller surfaces the issue
      throw new Error("SMTP configuration missing in production.");
    }
  }

  try {
    await transporter!.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[OptCamp] Failed to send email:", error);
  }
}

// ─── OTP Email ────────────────────────────────────────────────────────────────
/**
 * Central OTP email dispatcher.
 * - SMTP configured → sends real email (OTP never logged).
 * - Dev / no SMTP   → prints a clear terminal block with the OTP.
 * - Production / no SMTP → throws, returns a 500 to the caller.
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: string = "otp"
) {
  if (!smtpConfigured) {
    const expires = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString();
    console.log("\n====================================");
    console.log("   OPTCAMP DEV OTP");
    console.log("====================================");
    console.log(`  Email:   ${to}`);
    console.log(`  OTP:     ${otp}`);
    console.log(`  Purpose: ${purpose}`);
    console.log(`  Expires: 10 minutes (at ${expires})`);
    console.log("====================================\n");
    return;
  }

  const subjectMap: Record<string, string> = {
    signup:       "Verify your OptCamp account",
    admin_signup: "Verify your OptCamp admin request",
    login:        "Your OptCamp login code",
    reset:        "Your OptCamp password reset code",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OptCamp Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
  <span style="display:none;font-size:1px;color:#F5F7FA;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Your OptCamp verification code is ${otp}</span>
  
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F7FA; padding: 60px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="font-size: 20px; font-weight: 800; letter-spacing: 0.1em; color: #0F172A; margin: 0; text-transform: uppercase;">OPTCAMP</h1>
              <p style="font-size: 13px; color: #64748B; margin: 4px 0 0 0; font-weight: 500;">Cohort Operating System</p>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td align="center" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 48px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
              
              <h2 style="font-size: 20px; font-weight: 600; color: #0F172A; margin: 0 0 8px 0;">Welcome to OptCamp</h2>
              <p style="font-size: 15px; color: #475569; margin: 0 0 32px 0; line-height: 1.5;">
                You're almost ready to start your journey.<br>
                Please verify your email address to securely activate your OptCamp account.
              </p>
              
              <!-- OTP Container -->
              <table cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px 48px; margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 40px; font-weight: 700; letter-spacing: 0.25em; color: #0F172A;">${otp}</span>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 13px; color: #64748B; margin: 0 0 32px 0;">This verification code expires in 10 minutes.</p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/auth/verify-otp" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 0; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; background: linear-gradient(to right, #2563EB, #1D4ED8); border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Verify Account</a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #94A3B8; margin: 0; line-height: 1.5;">
                If the button doesn't work, simply enter the verification code on the verification screen.
              </p>
              
            </td>
          </tr>

          <!-- Security Reminder -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px;">
                <tr>
                  <td align="left">
                    <h4 style="font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 8px 0;">Security Reminder</h4>
                    <p style="font-size: 13px; color: #64748B; margin: 0 0 4px 0;">&bull; Never share this verification code.</p>
                    <p style="font-size: 13px; color: #64748B; margin: 0 0 4px 0;">&bull; OptCamp will never ask for your OTP.</p>
                    <p style="font-size: 13px; color: #64748B; margin: 0;">&bull; Ignore this email if you didn't request it.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0 0 12px 0;">
                <a href="${appUrl}/support" style="color: #94A3B8; text-decoration: none; margin: 0 8px;">Support</a>
                <a href="${appUrl}/privacy" style="color: #94A3B8; text-decoration: none; margin: 0 8px;">Privacy Policy</a>
                <a href="${appUrl}/terms" style="color: #94A3B8; text-decoration: none; margin: 0 8px;">Terms</a>
              </p>
              <p style="font-size: 12px; color: #94A3B8; margin: 0 0 4px 0;">&copy; ${new Date().getFullYear()} OptCamp. All rights reserved.</p>
              <p style="font-size: 12px; color: #CBD5E1; margin: 0;">This email was sent automatically.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter!.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: subjectMap[purpose] ?? "Your OptCamp verification code",
      html,
    });
  } catch (error) {
    console.error("[OptCamp] Failed to send OTP email:", error);
    throw error; // Re-throw so the route handler catches it and returns 500
  }
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    <p>Hi ${name},</p>
    <p>Welcome to OptCamp. We're excited to have you on board. Your account has been successfully created.</p>
    <p>You can now browse and apply to our active cohorts, participate in technical sprints, and earn certifications.</p>
  `;
  const html = getBaseTemplate("Welcome to OptCamp", "Your account has been created", content, { text: "Go to Dashboard", url: `${appUrl}/dashboard` });
  await sendMail(to, "Welcome to OptCamp", html);
}

// ─── 2. Application Received ──────────────────────────────────────────────────
export async function sendApplicationReceivedEmail(to: string, cohortName: string) {
  const content = `
    <p>We've received your application for the <strong>${cohortName}</strong> cohort.</p>
    <p>Our team will review your profile shortly. You will be notified of any status updates or if a technical screening is required.</p>
  `;
  const html = getBaseTemplate("Application Received", `We got your application for ${cohortName}`, content, { text: "View Application Status", url: `${appUrl}/dashboard` });
  await sendMail(to, `Application Received: ${cohortName}`, html);
}

// ─── 3. Application Status Update ────────────────────────────────────────────
export async function sendApplicationStatusEmail(to: string, cohortName: string, status: string) {
  let message = "";
  let subject = `Update on your application: ${cohortName}`;

  if (status === 'screening_required') {
    message = `<p>Your application for <strong>${cohortName}</strong> has been reviewed. You are required to complete a technical screening before final selection.</p>`;
  } else if (status === 'selected') {
    subject = `Congratulations! You've been selected for ${cohortName}`;
    message = `<p>We are thrilled to inform you that you have been selected for the <strong>${cohortName}</strong> cohort.</p><p>Please log in to your dashboard to accept your spot and enroll.</p>`;
  } else if (status === 'rejected') {
    message = `<p>Thank you for applying to the <strong>${cohortName}</strong> cohort. After careful consideration, we are unable to offer you a spot at this time.</p><p>We encourage you to apply for future cohorts.</p>`;
  } else {
    message = `<p>The status of your application for <strong>${cohortName}</strong> has been updated to: ${status.replace(/_/g, ' ')}.</p>`;
  }

  const html = getBaseTemplate("Application Status Update", `Update regarding ${cohortName}`, message, { text: "View Dashboard", url: `${appUrl}/dashboard` });
  await sendMail(to, subject, html);
}

// ─── 4. Screening Passed ──────────────────────────────────────────────────────
export async function sendScreeningPassedEmail(to: string, cohortName: string, score: number) {
  const content = `
    <p>Congratulations! You have successfully passed the technical screening for the <strong>${cohortName}</strong> cohort with a score of <strong>${score}%</strong>.</p>
    <p>Your application is now under final review by our selection committee.</p>
  `;
  const html = getBaseTemplate("Screening Passed", `You passed the screening for ${cohortName}`, content, { text: "View Application", url: `${appUrl}/dashboard` });
  await sendMail(to, `Screening Passed: ${cohortName}`, html);
}

// ─── 5. Cohort Start Reminder ─────────────────────────────────────────────────
export async function sendCohortStartEmail(to: string, cohortName: string, startDate: string) {
  const content = `
    <p>Get ready! The <strong>${cohortName}</strong> cohort is officially starting on <strong>${new Date(startDate).toLocaleDateString()}</strong>.</p>
    <p>Make sure to log in, review the sprint roadmap, and check for any initial announcements from the administrators.</p>
  `;
  const html = getBaseTemplate("Cohort Starting Soon", `${cohortName} starts on ${new Date(startDate).toLocaleDateString()}`, content, { text: "Enter Cohort Hub", url: `${appUrl}/dashboard` });
  await sendMail(to, `Reminder: ${cohortName} starts soon`, html);
}

// ─── 6. New Task Assigned ─────────────────────────────────────────────────────
export async function sendNewTaskEmail(to: string, cohortName: string, taskTitle: string, dueDate: string) {
  const content = `
    <p>A new task has been assigned in the <strong>${cohortName}</strong> cohort.</p>
    <div style="background: #111; border: 1px solid #333; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; color: #fff; font-weight: 500;">${taskTitle}</p>
      <p style="margin: 8px 0 0 0; color: #888; font-size: 13px;">Due: ${new Date(dueDate).toLocaleDateString()}</p>
    </div>
  `;
  const html = getBaseTemplate("New Task Assigned", `Task: ${taskTitle}`, content, { text: "View Task", url: `${appUrl}/dashboard` });
  await sendMail(to, `New Task: ${taskTitle}`, html);
}

// ─── 7. Task Revision Requested ───────────────────────────────────────────────
export async function sendTaskRevisionEmail(to: string, taskTitle: string, feedback: string) {
  const content = `
    <p>The administrator has reviewed your submission for <strong>${taskTitle}</strong> and requested revisions.</p>
    <p><strong>Feedback:</strong></p>
    <blockquote style="border-left: 2px solid #333; padding-left: 16px; margin: 16px 0; color: #fff; font-style: italic;">
      ${feedback}
    </blockquote>
    <p>Please review the feedback and resubmit your task.</p>
  `;
  const html = getBaseTemplate("Revision Requested", `Revision needed for ${taskTitle}`, content, { text: "Resubmit Task", url: `${appUrl}/dashboard` });
  await sendMail(to, `Revision Required: ${taskTitle}`, html);
}

// ─── 8. Certificate Earned ────────────────────────────────────────────────────
export async function sendCertificateEarnedEmail(to: string, cohortName: string, certId: string) {
  const content = `
    <p>Congratulations! You have successfully completed the <strong>${cohortName}</strong> cohort and earned your certificate of completion.</p>
    <p>Your hard work and dedication have paid off. You can now download and share your official OptCamp certification.</p>
  `;
  const html = getBaseTemplate("Certificate Earned", `You earned a certificate for ${cohortName}`, content, { text: "View Certificate", url: `${appUrl}/certificate/${certId}` });
  await sendMail(to, `Certificate Earned: ${cohortName}`, html);
}
