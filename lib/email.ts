import nodemailer from "nodemailer";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function sendVerificationEmail(email: string, code: string) {
  await sendCodeEmail({
    email,
    code,
    subject: "Verify your DWS Maker account",
    title: "Verify your DWS Maker account",
    intro: "Your teaching schedules can now be saved securely and accessed from any device.",
  });
}

export async function sendPasswordResetEmail(email: string, code: string) {
  await sendCodeEmail({
    email,
    code,
    subject: "Reset your DWS Maker password",
    title: "Reset your DWS Maker password",
    intro: "Use the code below to choose a new password. If you did not request this, ignore this email and your password will remain unchanged.",
  });
}

async function sendCodeEmail({ email, code, subject, title, intro }: {
  email: string;
  code: string;
  subject: string;
  title: string;
  intro: string;
}) {
  const port = Number(required("SMTP_PORT"));
  const transport = nodemailer.createTransport({
    host: required("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: {
      user: required("SMTP_USER"),
      pass: required("SMTP_PASS"),
    },
  });

  await transport.sendMail({
    from: required("SMTP_FROM"),
    to: email,
    subject,
    text: `${title}\n\n${intro}\n\nYour six-digit code is ${code}.\n\nThis code expires in 15 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14213d">
        <h1 style="font-size:24px;margin-bottom:8px">${title}</h1>
        <p>${intro}</p>
        <p>Enter this code in DWS Maker:</p>
        <p style="margin:28px 0;font-size:32px;font-weight:800;letter-spacing:8px;background:#f1f5f9;padding:16px;text-align:center;border-radius:8px">
          ${code}
        </p>
        <p style="font-size:13px;color:#64748b">This code expires in 15 minutes.</p>
      </div>
    `,
  });
}
