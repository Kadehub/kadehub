import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { name, email, business, country, description, budget } = await req.json();

  if (!name || !email || !business || !country || !description || !budget) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"KadeHub Quotes" <${process.env.GMAIL_USER}>`,
    to: 'official.kadehub@gmail.com',
    replyTo: email,
    subject: `New Quote Request — ${business} (${country})`,
    html: `
      <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#f8fffe;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0d6e5a,#14a085);padding:32px 36px;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">New Quote Request</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Submitted via KadeHub landing page</p>
        </div>
        <div style="padding:32px 36px;background:#fff;">
          <table style="width:100%;border-collapse:collapse;">
            ${[
              ['Full Name', name],
              ['Email', email],
              ['Business Type', business],
              ['Country', country],
              ['Budget Range', budget],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;font-size:13px;font-weight:700;color:#6b7280;width:140px;vertical-align:top;">${label}</td>
                <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">${value}</td>
              </tr>
            `).join('')}
            <tr>
              <td style="padding:10px 0;font-size:13px;font-weight:700;color:#6b7280;vertical-align:top;">Description</td>
              <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;line-height:1.6;">${description.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
        </div>
        <div style="padding:20px 36px;background:#f8fffe;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Reply directly to this email to respond to ${name}.</p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
