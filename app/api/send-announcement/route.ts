import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { emails, title, message } = await request.json();

    const data = await resend.emails.send({
      from: "DITLS <onboarding@resend.dev>",
      to: emails,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>${title}</h2>

          <p>${message}</p>

          <hr/>

          <p><strong>DITLS Computer & Robotics Laboratory Booking System</strong></p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      `,
    });

    return Response.json({
      success: true,
      data,
    });

  } catch (error) {

    console.error(error);

    return Response.json(
      {
        success: false,
        error,
      },
      {
        status: 500,
      }
    );
  }
}