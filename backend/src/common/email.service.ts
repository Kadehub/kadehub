import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async send(to: string, subject: string, html: string) {
    if (!process.env.SMTP_USER) {
      this.logger.warn(`Email skipped (no SMTP config): ${subject} → ${to}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"KadeHub Platform" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent: ${subject} → ${to}`);
    } catch (err) {
      this.logger.error(`Email failed: ${err.message}`);
    }
  }

  async notifySubscription(shopName: string, planName: string, amount: number) {
    const admin = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!admin) return;
    await this.send(
      admin,
      `New Subscription: ${shopName}`,
      `<h2>New Subscription</h2>
       <p><strong>${shopName}</strong> subscribed to <strong>${planName}</strong> for <strong>LKR ${amount.toLocaleString()}</strong>.</p>`,
    );
  }

  async notifyPaymentFailed(shopName: string, planName: string) {
    const admin = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!admin) return;
    await this.send(
      admin,
      `Payment Failed: ${shopName}`,
      `<h2>Payment Failed</h2>
       <p>Payment failed for <strong>${shopName}</strong> on plan <strong>${planName}</strong>.</p>`,
    );
  }

  async notifyExpiringSoon(shopName: string, daysLeft: number) {
    const admin = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!admin) return;
    await this.send(
      admin,
      `Plan Expiring Soon: ${shopName}`,
      `<h2>Plan Expiring Soon</h2>
       <p><strong>${shopName}</strong>'s subscription expires in <strong>${daysLeft} days</strong>.</p>`,
    );
  }
}
