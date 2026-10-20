import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export type CodAuditAction = 'created' | 'updated' | 'deleted' | 'status' | 'payment' | 'budget';
export type CodAuditEntity = 'cod_order' | 'cod_expense' | 'cod_personal_expense' | 'cod_credit' | 'cod_personal_settings';

/**
 * Best-effort audit trail for COD, written to the shared audit_log table.
 * Never throws: a failed log line must not fail the user's action.
 * Personal-expense entries should only carry the category and amount in `summary`.
 */
@Injectable()
export class CodAuditService {
  private readonly logger = new Logger(CodAuditService.name);

  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(user: { sub: number; tenant_id: number }, action: CodAuditAction, entity: CodAuditEntity, entityId: number | null, summary: string) {
    try {
      await this.repo.insert({
        tenant_id: user.tenant_id,
        user_id: user.sub,
        action,
        entity,
        entity_id: entityId ?? null,
        details: { summary },
      } as any);
    } catch (err) {
      this.logger.warn(`audit log skipped (${entity} ${action}): ${(err as Error).message}`);
    }
  }
}
