import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Shift } from '../../database/entities/shift.entity';
import { Sale } from '../../database/entities/sale.entity';
import { OpenShiftDto, CloseShiftDto } from './staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(Shift) private shiftRepo: Repository<Shift>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
  ) {}

  getAuditLogs(tenantId: number, from: string, to: string) {
    return this.auditRepo.createQueryBuilder('a')
      .leftJoin('a.user', 'u')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(a.created_at) BETWEEN :from AND :to', { from, to })
      .select([
        'a.id as id',
        'a.action as action',
        'a.entity as entity',
        'a.entity_id as entity_id',
        'a.details as details',
        'a.created_at as created_at',
        'u.name as user_name',
      ])
      .orderBy('a.created_at', 'DESC')
      .limit(200)
      .getRawMany();
  }

  log(tenantId: number, userId: number, action: string, entity: string, entityId?: number, details?: any) {
    return this.auditRepo.save(this.auditRepo.create({ tenant_id: tenantId, user_id: userId, action, entity, entity_id: entityId, details }));
  }

  getShifts(tenantId: number) {
    return this.shiftRepo.find({
      where: { tenant_id: tenantId },
      relations: ['user'],
      order: { opened_at: 'DESC' },
      take: 50,
    });
  }

  async openShift(tenantId: number, userId: number, dto: OpenShiftDto) {
    return this.shiftRepo.save(this.shiftRepo.create({ tenant_id: tenantId, user_id: userId, opening_cash: dto.opening_cash, notes: dto.notes }));
  }

  async closeShift(shiftId: number, tenantId: number, dto: CloseShiftDto) {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId, tenant_id: tenantId } });
    if (!shift) return null;
    shift.closed_at = new Date();
    shift.closing_cash = dto.closing_cash;
    if (dto.notes) shift.notes = dto.notes;
    return this.shiftRepo.save(shift);
  }

  async getShiftReport(shiftId: number, tenantId: number) {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId, tenant_id: tenantId }, relations: ['user'] });
    if (!shift) return null;
    const sales = await this.saleRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.user_id = :userId', { userId: shift.user_id })
      .andWhere('s.created_at >= :opened', { opened: shift.opened_at })
      .andWhere(shift.closed_at ? 's.created_at <= :closed' : '1=1', { closed: shift.closed_at })
      .select(['COUNT(s.id) as total_sales', 'SUM(s.total_amount) as revenue', 'SUM(CASE WHEN s.payment_method="CASH" THEN s.total_amount ELSE 0 END) as cash_revenue'])
      .getRawOne();
    return { shift, sales };
  }

  getCashierPerformance(tenantId: number, from: string, to: string) {
    return this.saleRepo.createQueryBuilder('s')
      .leftJoin('s.user', 'u')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('DATE(s.created_at) BETWEEN :from AND :to', { from, to })
      .andWhere('s.status = :status', { status: 'completed' })
      .groupBy('s.user_id, u.name')
      .select(['u.name as cashier', 'COUNT(s.id) as total_sales', 'SUM(s.total_amount) as revenue', 'AVG(s.total_amount) as avg_sale'])
      .orderBy('revenue', 'DESC')
      .getRawMany();
  }
}
