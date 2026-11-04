import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../common/email.service';

/**
 * Internal alerts to the platform admin over the existing SMTP notifier. They go to a fixed address from the
 * environment, never to anyone outside, so they don't pass through customer approval. EmailService stamps them
 * with the agent header, which is what keeps the agent from ever reading its own alert.
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private email: EmailService) {}

  async notify(subject: string, text: string) {
    const to = process.env.SUPER_ADMIN_EMAIL;
    this.logger.warn(`Alert: ${subject}`);
    if (!to) return;
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await this.email.send(to, `[KadeHub] ${subject}`, `<p>${safe}</p>`).catch(err => this.logger.error(`Alert failed: ${err.message}`));
  }
}
