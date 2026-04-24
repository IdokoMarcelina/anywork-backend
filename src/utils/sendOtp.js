import { Resend } from "resend";

const sendOtpEmail = async (email, otp) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Anywork account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Welcome to Anywork 👋</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error); // ← will show in Render logs
    throw new Error(error.message);
  }

  console.log("Email sent:", data); // ← confirm it sent
};

export default sendOtpEmail;