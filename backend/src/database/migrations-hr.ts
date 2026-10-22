import type { DataSource } from 'typeorm';
import type { Migration } from './migrations';
import { tableExists } from './migration-utils';
import { HR_PLANS } from '../modules/hr/hr-plans';

/** Schema for KadeHub Staff (tables prefixed hr_). Ids 300-399. */

/** Column spec: name, Postgres type, MySQL type (constraints included). */
type Col = [string, string, string];

const ID: Col = ['id', 'SERIAL PRIMARY KEY', 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY'];
const TENANT: Col = ['tenant_id', 'INT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE', 'INT NOT NULL'];
const CREATED: Col = ['created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'];
const UPDATED: Col = ['updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'];
const money = (name: string, def = '0'): Col => [name, `DECIMAL(14,2) NOT NULL DEFAULT ${def}`, `DECIMAL(14,2) NOT NULL DEFAULT ${def}`];
const dec = (name: string, def = '0'): Col => [name, `DECIMAL(8,2) NOT NULL DEFAULT ${def}`, `DECIMAL(8,2) NOT NULL DEFAULT ${def}`];
const text = (name: string, len = 255, def = "''"): Col => [name, `VARCHAR(${len}) NOT NULL DEFAULT ${def}`, `VARCHAR(${len}) NOT NULL DEFAULT ${def}`];
const optText = (name: string, len = 255): Col => [name, `VARCHAR(${len}) NULL`, `VARCHAR(${len}) NULL`];
const longText = (name: string): Col => [name, 'TEXT NULL', 'TEXT NULL'];
const int = (name: string, def = '0'): Col => [name, `INT NOT NULL DEFAULT ${def}`, `INT NOT NULL DEFAULT ${def}`];
const optInt = (name: string): Col => [name, 'INT NULL', 'INT NULL'];
const date = (name: string): Col => [name, 'DATE NOT NULL', 'DATE NOT NULL'];
const optDate = (name: string): Col => [name, 'DATE NULL', 'DATE NULL'];
const stamp = (name: string): Col => [name, 'TIMESTAMP NULL', 'DATETIME NULL'];
const bool = (name: string, def: boolean): Col => [name, `BOOLEAN NOT NULL DEFAULT ${def ? 'TRUE' : 'FALSE'}`, `TINYINT(1) NOT NULL DEFAULT ${def ? 1 : 0}`];
/** Foreign key to another hr_ table. Postgres inline; MySQL gets a table constraint from `fk()`. */
const ref = (name: string, table: string, onDelete: 'CASCADE' | 'SET NULL', nullable = false): Col =>
  [name, `INT ${nullable ? 'NULL' : 'NOT NULL'} REFERENCES ${table}(id) ON DELETE ${onDelete}`, `INT ${nullable ? 'NULL' : 'NOT NULL'}`];
const fk = (col: string, table: string, onDelete: 'CASCADE' | 'SET NULL') =>
  `FOREIGN KEY (\`${col}\`) REFERENCES \`${table}\` (\`id\`) ON DELETE ${onDelete}`;
const TENANT_FK = fk('tenant_id', 'tenant', 'CASCADE');

/** CREATE TABLE for either dialect; `extra` holds constraints written for both (UNIQUE …). */
async function createTable(ds: DataSource, pg: boolean, table: string, cols: Col[], extra: string[] = [], mysqlOnly: string[] = []) {
  if (await tableExists(ds, table)) return;
  const q = (n: string) => (pg ? n : `\`${n}\``);
  const body = [
    ...cols.map(([n, p, m]) => `${q(n)} ${pg ? p : m}`),
    ...extra,
    ...(pg ? [] : [TENANT_FK, ...mysqlOnly]),
  ].join(',\n  ');
  await ds.query(`CREATE TABLE ${q(table)} (\n  ${body}\n)`);
}

async function createIndex(ds: DataSource, pg: boolean, name: string, table: string, cols: string) {
  if (pg) await ds.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`);
  else await ds.query(`CREATE INDEX ${name} ON \`${table}\` (${cols})`).catch(() => {});
}

export const HR_MIGRATIONS: Migration[] = [
  {
    id: '300_hr_schema',
    up: async (ds, dialect) => {
      const pg = dialect === 'postgres';
      const t = (table: string, cols: Col[], extra: string[] = [], mysqlOnly: string[] = []) => createTable(ds, pg, table, cols, extra, mysqlOnly);

      // ── Organisation ──
      await t('hr_settings', [
        ID, TENANT,
        text('business_name', 150), text('phone', 40), text('address', 300),
        ['logo_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'],
        text('brand_color', 7, "'#7c3aed'"),
        dec('work_hours_per_day', '8'), int('late_grace_minutes', '10'), int('overtime_min_minutes', '30'),
        dec('overtime_multiplier', '1.5'), int('nopay_divisor', '30'), int('max_weekly_hours', '60'),
        // Comma-separated weekdays off (0 = Sunday), used when counting leave and working days
        text('weekly_off_days', 20, "'0'"),
        bool('deduct_absent', true), bool('deduct_late', false), bool('require_photo', false),
        dec('epf_employee_pct', '8'), dec('epf_employer_pct', '12'), dec('etf_employer_pct', '3'),
        text('payslip_footer', 300),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id)']);

      await t('hr_branch', [
        ID, TENANT, text('name', 120), text('address', 300), text('phone', 40), bool('is_active', true), CREATED,
      ]);
      await createIndex(ds, pg, 'hr_branch_tenant_idx', 'hr_branch', 'tenant_id');

      // Which tenant users manage which branches (owners — role ADMIN — see every branch)
      await t('hr_branch_manager', [
        ID, TENANT, int('user_id'), ref('branch_id', 'hr_branch', 'CASCADE'), CREATED,
      ], ['UNIQUE (user_id, branch_id)'], [fk('branch_id', 'hr_branch', 'CASCADE')]);

      await t('hr_employee', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'SET NULL', true),
        text('emp_code', 20), text('full_name', 150), text('phone', 40), text('email', 150), text('nic', 20),
        text('address', 300), optDate('dob'), text('gender', 10),
        ['photo_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'],
        text('emergency_name', 150), text('emergency_phone', 40),
        text('job_title', 100), text('department', 100),
        text('employment_type', 20, "'full_time'"), optDate('join_date'),
        text('status', 20, "'active'"), optDate('leave_date'), text('leave_reason', 300),
        text('pay_type', 10, "'monthly'"), money('base_salary'), money('fixed_allowance'),
        bool('epf_enabled', true), text('epf_number', 40),
        text('bank_name', 100), text('bank_account', 60),
        optText('pin_hash', 100),
        longText('notes'),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id, emp_code)'], [fk('branch_id', 'hr_branch', 'SET NULL')]);
      await createIndex(ds, pg, 'hr_employee_branch_idx', 'hr_employee', 'tenant_id, branch_id, status');

      await t('hr_employee_document', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'), text('title', 150), text('url', 500), CREATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE')]);

      // ── Shifts, rosters and attendance ──
      await t('hr_shift_template', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'CASCADE', true),
        text('name', 60), text('start_time', 5), text('end_time', 5), int('break_minutes'), text('color', 7, "'#7c3aed'"),
        CREATED,
      ], [], [fk('branch_id', 'hr_branch', 'CASCADE')]);

      await t('hr_roster_entry', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'CASCADE'), ref('employee_id', 'hr_employee', 'CASCADE'),
        date('work_date'), text('start_time', 5), text('end_time', 5), int('break_minutes'),
        optInt('shift_template_id'), text('note', 200),
        CREATED,
      ], ['UNIQUE (employee_id, work_date)'], [fk('branch_id', 'hr_branch', 'CASCADE'), fk('employee_id', 'hr_employee', 'CASCADE')]);
      await createIndex(ds, pg, 'hr_roster_branch_date_idx', 'hr_roster_entry', 'tenant_id, branch_id, work_date');

      await t('hr_shift_swap', [
        ID, TENANT,
        ref('entry_id', 'hr_roster_entry', 'CASCADE'),
        ref('requester_id', 'hr_employee', 'CASCADE'), ref('target_id', 'hr_employee', 'CASCADE'),
        // Null target entry = give the shift away; set = trade shifts
        ref('target_entry_id', 'hr_roster_entry', 'SET NULL', true),
        text('status', 20, "'pending_colleague'"), text('reason', 300),
        optInt('decided_by'), stamp('decided_at'),
        CREATED,
      ], [], [
        fk('entry_id', 'hr_roster_entry', 'CASCADE'), fk('requester_id', 'hr_employee', 'CASCADE'),
        fk('target_id', 'hr_employee', 'CASCADE'), fk('target_entry_id', 'hr_roster_entry', 'SET NULL'),
      ]);

      await t('hr_attendance', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'), ref('branch_id', 'hr_branch', 'SET NULL', true),
        date('work_date'), ['clock_in', 'TIMESTAMP NOT NULL', 'DATETIME NOT NULL'], stamp('clock_out'),
        ['photo_in_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'], ['photo_out_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'],
        text('source', 10, "'kiosk'"),
        int('scheduled_minutes'), int('worked_minutes'), int('late_minutes'), int('early_leave_minutes'), int('overtime_minutes'),
        text('note', 300), optInt('edited_by'),
        CREATED, UPDATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE'), fk('branch_id', 'hr_branch', 'SET NULL')]);
      await createIndex(ds, pg, 'hr_attendance_emp_date_idx', 'hr_attendance', 'tenant_id, employee_id, work_date');
      await createIndex(ds, pg, 'hr_attendance_date_idx', 'hr_attendance', 'tenant_id, work_date');

      // ── Leave ──
      await t('hr_leave_type', [
        ID, TENANT, text('name', 60), dec('days_per_year'), bool('paid', true), text('color', 7, "'#16a34a'"), bool('is_active', true), CREATED,
      ]);

      await t('hr_leave_request', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'), ref('leave_type_id', 'hr_leave_type', 'CASCADE'),
        date('start_date'), date('end_date'), bool('half_day', false), dec('days'),
        text('reason', 300), text('status', 20, "'pending'"),
        optInt('decided_by'), stamp('decided_at'), text('decision_note', 300),
        CREATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE'), fk('leave_type_id', 'hr_leave_type', 'CASCADE')]);
      await createIndex(ds, pg, 'hr_leave_emp_idx', 'hr_leave_request', 'tenant_id, employee_id, start_date');

      await t('hr_holiday', [ID, TENANT, date('holiday_date'), text('name', 100), CREATED], ['UNIQUE (tenant_id, holiday_date)']);

      // ── Payroll ──
      await t('hr_advance', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'),
        money('amount'), date('given_date'), money('monthly_deduction'), text('note', 300), text('status', 10, "'open'"),
        CREATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE')]);

      await t('hr_payroll_run', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'SET NULL', true),
        text('period', 7), text('status', 12, "'draft'"),
        money('total_gross'), money('total_deductions'), money('total_net'), money('total_employer'),
        optInt('created_by'), stamp('finalized_at'),
        CREATED, UPDATED,
      ], [], [fk('branch_id', 'hr_branch', 'SET NULL')]);
      await createIndex(ds, pg, 'hr_payroll_run_period_idx', 'hr_payroll_run', 'tenant_id, period');

      await t('hr_payslip', [
        ID, TENANT, ref('run_id', 'hr_payroll_run', 'CASCADE'), ref('employee_id', 'hr_employee', 'CASCADE'),
        text('pay_type', 10, "'monthly'"), money('rate'),
        dec('days_worked'), dec('absent_days'), dec('nopay_days'), dec('paid_leave_days'), dec('hours_worked'), dec('overtime_hours'), int('late_minutes'),
        money('base_pay'), money('nopay_deduction'), money('overtime_pay'), money('allowances'), money('bonus'), money('other_earnings'),
        money('gross'),
        money('epf_employee'), money('late_deduction'), money('advance_deduction'), money('asset_deduction'), money('other_deductions'),
        money('total_deductions'), money('net_pay'),
        money('epf_employer'), money('etf_employer'),
        text('note', 300), stamp('paid_at'), text('payment_method', 20),
        CREATED,
      ], ['UNIQUE (run_id, employee_id)'], [fk('run_id', 'hr_payroll_run', 'CASCADE'), fk('employee_id', 'hr_employee', 'CASCADE')]);

      await t('hr_advance_repayment', [
        ID, TENANT, ref('advance_id', 'hr_advance', 'CASCADE'), ref('payslip_id', 'hr_payslip', 'CASCADE', true),
        money('amount'), date('paid_date'), CREATED,
      ], [], [fk('advance_id', 'hr_advance', 'CASCADE'), fk('payslip_id', 'hr_payslip', 'CASCADE')]);

      // ── Hiring ──
      await t('hr_job_post', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'SET NULL', true),
        text('title', 150), longText('description'), text('employment_type', 20, "'full_time'"),
        money('salary_min'), money('salary_max'), text('status', 10, "'open'"), text('token', 24), optDate('closes_at'),
        CREATED, UPDATED,
      ], ['UNIQUE (token)'], [fk('branch_id', 'hr_branch', 'SET NULL')]);

      await t('hr_applicant', [
        ID, TENANT, ref('job_id', 'hr_job_post', 'CASCADE'),
        text('name', 150), text('phone', 40), text('email', 150),
        ['cv_url', 'VARCHAR(500) NULL', 'VARCHAR(500) NULL'], longText('cover_note'),
        text('stage', 20, "'new'"), int('rating'), text('source', 20, "'manual'"),
        stamp('interview_at'), optInt('employee_id'),
        CREATED, UPDATED,
      ], [], [fk('job_id', 'hr_job_post', 'CASCADE')]);
      await createIndex(ds, pg, 'hr_applicant_job_idx', 'hr_applicant', 'tenant_id, job_id, stage');

      await t('hr_interview_note', [
        ID, TENANT, ref('applicant_id', 'hr_applicant', 'CASCADE'), int('author_id'), text('author_name', 150),
        longText('note'), int('rating'), CREATED,
      ], [], [fk('applicant_id', 'hr_applicant', 'CASCADE')]);

      // ── Performance and discipline ──
      await t('hr_review', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'),
        text('period', 60), date('review_date'), int('reviewer_id'), text('reviewer_name', 150),
        longText('ratings'), dec('overall'), longText('strengths'), longText('improvements'), longText('goals'),
        stamp('acknowledged_at'),
        CREATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE')]);

      await t('hr_warning', [
        ID, TENANT, ref('employee_id', 'hr_employee', 'CASCADE'),
        text('level', 10, "'verbal'"), date('warning_date'), text('reason', 200), longText('details'),
        int('issued_by'), text('issued_by_name', 150), stamp('acknowledged_at'),
        CREATED,
      ], [], [fk('employee_id', 'hr_employee', 'CASCADE')]);

      // ── Assets ──
      await t('hr_asset', [
        ID, TENANT, ref('branch_id', 'hr_branch', 'SET NULL', true),
        text('code', 40), text('name', 150), text('category', 20, "'other'"), money('value'),
        text('status', 12, "'available'"), text('notes', 300),
        CREATED, UPDATED,
      ], ['UNIQUE (tenant_id, code)'], [fk('branch_id', 'hr_branch', 'SET NULL')]);

      await t('hr_asset_assignment', [
        ID, TENANT, ref('asset_id', 'hr_asset', 'CASCADE'), ref('employee_id', 'hr_employee', 'CASCADE'),
        date('issued_date'), optDate('returned_date'), text('condition_out', 100), text('condition_in', 100),
        money('deduction_amount'), optInt('deducted_payslip_id'), text('notes', 300),
        CREATED,
      ], [], [fk('asset_id', 'hr_asset', 'CASCADE'), fk('employee_id', 'hr_employee', 'CASCADE')]);
      await createIndex(ds, pg, 'hr_asset_assignment_emp_idx', 'hr_asset_assignment', 'tenant_id, employee_id');
    },
  },
  {
    id: '301_hr_packages',
    up: async (ds, dialect) => {
      // Staff plans live in the shared package table (product = 'hr') so the existing
      // bank-transfer / OnePay checkout can sell them; each grants the single 'hr' module.
      const pg = dialect === 'postgres';
      const p = (i: number) => (pg ? `$${i}` : '?');
      for (const plan of HR_PLANS) {
        const found: Array<{ id: number }> = await ds.query(`SELECT id FROM package WHERE slug = ${p(1)}`, [plan.slug]);
        let packageId = found[0]?.id;
        if (!packageId) {
          const values = [plan.slug, plan.name, plan.description, plan.monthly_price_lkr, plan.monthly_price_lkr * 10, plan.sort_order, plan.slug === 'hr-business'];
          const cols = 'slug, name, description, price_monthly, price_yearly, sort_order, is_popular, is_active, product';
          const ph = values.map((_, i) => p(i + 1)).join(', ');
          if (pg) {
            const rows = await ds.query(`INSERT INTO package (${cols}) VALUES (${ph}, TRUE, 'hr') RETURNING id`, values);
            packageId = rows[0].id;
          } else {
            await ds.query(`INSERT INTO package (${cols}) VALUES (${ph}, 1, 'hr')`, values);
            packageId = (await ds.query('SELECT id FROM package WHERE slug = ?', [plan.slug]))[0].id;
          }
        }
        const mod = await ds.query(`SELECT id FROM package_module WHERE package_id = ${p(1)} AND module_name = 'hr'`, [packageId]);
        if (!mod.length) await ds.query(`INSERT INTO package_module (package_id, module_name) VALUES (${p(1)}, 'hr')`, [packageId]);
      }
    },
  },
];
