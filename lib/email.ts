import nodemailer from "nodemailer";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function sendVerificationEmail(email: string, verificationUrl: string) {
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
    subject: "Verify your DWS Maker account",
    text: `Welcome to DWS Maker.\n\nVerify your email by opening this link:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14213d">
        <h1 style="font-size:24px;margin-bottom:8px">Verify your DWS Maker account</h1>
        <p>Your teaching schedules can now be saved securely and accessed from any device.</p>
        <p style="margin:28px 0">
          <a href="${verificationUrl}" style="background:#b91c1c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">
            Verify email
          </a>
        </p>
        <p style="font-size:13px;color:#64748b">This link expires in 24 hours. If you did not register, you can ignore this email.</p>
      </div>
    `,
  });
}
