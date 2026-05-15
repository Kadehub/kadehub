import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as https from 'https';

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);

  private get token()  { return process.env.CLOUDFLARE_API_TOKEN; }
  private get zoneId() { return process.env.CLOUDFLARE_ZONE_ID; }
  private get baseDomain() { return process.env.CLOUDFLARE_BASE_DOMAIN || 'kadehub.com'; }

  /** POST /zones/:zoneId/dns_records — creates CNAME subdomain → baseDomain */
  async createSubdomain(subdomain: string): Promise<string> {
    if (!this.token || !this.zoneId) {
      this.logger.warn('Cloudflare credentials not set — skipping DNS record creation');
      return null;
    }

    const body = JSON.stringify({
      type: 'CNAME',
      name: `${subdomain}.${this.baseDomain}`,
      content: this.baseDomain,
      ttl: 1,        // 1 = automatic
      proxied: true, // goes through Cloudflare proxy (orange cloud)
    });

    const res = await this.request('POST', `/zones/${this.zoneId}/dns_records`, body);

    if (!res.success) {
      const msg = res.errors?.[0]?.message || 'Cloudflare DNS creation failed';
      this.logger.error(`DNS create failed for ${subdomain}: ${msg}`);
      throw new InternalServerErrorException(`Could not create subdomain: ${msg}`);
    }

    this.logger.log(`DNS record created: ${subdomain}.${this.baseDomain} → ${this.baseDomain}`);
    return res.result?.id ?? null;
  }

  /** DELETE /zones/:zoneId/dns_records/:recordId */
  async deleteSubdomain(dnsRecordId: string): Promise<void> {
    if (!this.token || !this.zoneId || !dnsRecordId) return;
    await this.request('DELETE', `/zones/${this.zoneId}/dns_records/${dnsRecordId}`);
    this.logger.log(`DNS record deleted: ${dnsRecordId}`);
  }

  private request(method: string, path: string, body?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.cloudflare.com',
        path: `/client/v4${path}`,
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        },
      };

      const req = https.request(options, res => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error('Cloudflare response parse error')); }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Cloudflare request timeout')); });
      if (body) req.write(body);
      req.end();
    });
  }
}
