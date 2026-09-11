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
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: `"KadeHub Platform" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent: ${subject} → ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Email failed: ${err.message}`);
      return false;
    }
  }

  private adminEmail() {
    return process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_USER;
  }

  async notifySubscription(shopName: string, planName: string, amount: number, shopEmail?: string) {
    const admin = this.adminEmail();
    if (admin) {
      await this.send(
        admin,
        `New Subscription: ${shopName}`,
        `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#00796B">New Subscription</h2>
          <p><strong>${shopName}</strong> subscribed to <strong>${planName}</strong> for <strong>LKR ${amount.toLocaleString()}</strong>.</p>
        </div>`,
      );
    }
    if (shopEmail) {
      await this.send(
        shopEmail,
        `Your KadeHub ${planName} plan is active`,
        `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#00796B">Subscription Confirmed</h2>
          <p>Hi,</p>
          <p>Your shop <strong>${shopName}</strong> is now subscribed to the <strong>${planName}</strong> plan.</p>
          <p>Amount: <strong>LKR ${amount.toLocaleString()}</strong></p>
          <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com'}/settings?tab=billing" style="background:#00796B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">View Billing</a></p>
        </div>`,
      );
    }
  }

  async notifyPaymentFailed(shopName: string, planName: string, shopEmail?: string, reason?: string) {
    const admin = this.adminEmail();
    if (admin) {
      await this.send(
        admin,
        `Payment Failed: ${shopName}`,
        `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#dc2626">Payment Failed</h2>
          <p>Payment failed for <strong>${shopName}</strong> on plan <strong>${planName}</strong>.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
        </div>`,
      );
    }
    if (shopEmail) {
      await this.send(
        shopEmail,
        `KadeHub payment could not be processed`,
        `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#dc2626">Payment Failed</h2>
          <p>We could not process your payment for <strong>${planName}</strong>.</p>
          ${reason ? `<p>${reason}</p>` : ''}
          <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com'}/settings?tab=billing" style="background:#00796B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Try Again</a></p>
        </div>`,
      );
    }
  }

  async notifyExpiringSoon(shopName: string, daysLeft: number, shopEmail?: string) {
    const admin = this.adminEmail();
    if (admin) {
      await this.send(
        admin,
        `Plan Expiring Soon: ${shopName}`,
        `<h2>Plan Expiring Soon</h2>
         <p><strong>${shopName}</strong>'s subscription expires in <strong>${daysLeft} days</strong>.</p>`,
      );
    }
    if (shopEmail) {
      await this.send(
        shopEmail,
        `Your KadeHub plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        `<div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#b45309">Plan Expiring Soon</h2>
          <p>Your shop <strong>${shopName}</strong> subscription expires in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>.</p>
          <p>Renew now to avoid interruption to your POS, inventory, and other modules.</p>
          <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com'}/settings?tab=billing" style="background:#00796B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Renew Plan</a></p>
        </div>`,
      );
    }
  }

  async sendInvoice(to: string, invoiceNumber: string, html: string) {
    return this.send(to, `Your KadeHub Invoice — ${invoiceNumber}`, html);
  }
}
