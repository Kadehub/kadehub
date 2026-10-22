import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { HrBranch, HrBranchManager, HrEmployee, HrEmployeeDocument, HrSettings } from '../../database/entities/hr-core.entity';
import {
  HrAttendance, HrHoliday, HrLeaveRequest, HrLeaveType, HrRosterEntry, HrShiftSwap, HrShiftTemplate,
} from '../../database/entities/hr-time.entity';
import { HrAdvance, HrAdvanceRepayment, HrPayrollRun, HrPayslip } from '../../database/entities/hr-payroll.entity';
import {
  HrApplicant, HrAsset, HrAssetAssignment, HrInterviewNote, HrJobPost, HrReview, HrWarning,
} from '../../database/entities/hr-talent.entity';
import { HR_CONTROLLERS } from './hr.controller';
import { HrGuard } from './hr-access';
import { HrAccountService } from './hr-account.service';
import { HrOrgService } from './hr-org.service';
import { HrTimeService } from './hr-time.service';
import { HrPayrollService } from './hr-payroll.service';
import { HrTalentService } from './hr-talent.service';
import { HrReportsService } from './hr-reports.service';

/** KadeHub Staff (staff.kadehub.com): employees, rosters, attendance, leave, payroll, hiring, reviews and assets. */
@Module({
  imports: [TypeOrmModule.forFeature([
    Subscription, Package, User, AuditLog,
    HrSettings, HrBranch, HrBranchManager, HrEmployee, HrEmployeeDocument,
    HrShiftTemplate, HrRosterEntry, HrShiftSwap, HrAttendance, HrLeaveType, HrLeaveRequest, HrHoliday,
    HrAdvance, HrAdvanceRepayment, HrPayrollRun, HrPayslip,
    HrJobPost, HrApplicant, HrInterviewNote, HrReview, HrWarning, HrAsset, HrAssetAssignment,
  ])],
  controllers: HR_CONTROLLERS,
  providers: [HrGuard, HrAccountService, HrOrgService, HrTimeService, HrPayrollService, HrTalentService, HrReportsService],
  exports: [HrAccountService],
})
export class HrModule {}
