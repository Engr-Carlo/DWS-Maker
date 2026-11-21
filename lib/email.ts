import nodemailer from "nodemailer";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function sendVerificationEmail(email: string, code: string) {
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
    text: `Welcome to DWS Maker.\n\nYour verification code is ${code}.\n\nThis code expires in 15 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14213d">
        <h1 style="font-size:24px;margin-bottom:8px">Verify your DWS Maker account</h1>
        <p>Your teaching schedules can now be saved securely and accessed from any device.</p>
        <p>Enter this verification code in DWS Maker:</p>
        <p style="margin:28px 0;font-size:32px;font-weight:800;letter-spacing:8px;background:#f1f5f9;padding:16px;text-align:center;border-radius:8px">
          ${code}
        </p>
        <p style="font-size:13px;color:#64748b">This code expires in 15 minutes. If you did not register, you can ignore this email.</p>
      </div>
    `,
  });
}
