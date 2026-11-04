import { Injectable } from '@nestjs/common';
import { Actor, EaDb, Sql, audit, parseList } from './ea-db';

export interface AgentSettings {
  paused: boolean;
  activated_at: Date | null;
  mode: 'triage_only' | 'drafting';
  daily_send_limit: number;
  monthly_budget_usd: number;
  model_classify: string;
  model_draft: string;
  model_research: string;
  languages: string[];
  allowed_domains: string[];
  approved_claims: string[];
  follow_up_gaps_days: number[];
  max_follow_ups: number;
  timezone: string;
  budget_alerted_month: string | null;
}

const LIST_FIELDS = ['languages', 'allowed_domains', 'approved_claims'] as const;

export function toSettings(row: any): AgentSettings {
  return {
    paused: !!row.paused,
    activated_at: row.activated_at ?? null,
    mode: row.mode === 'drafting' ? 'drafting' : 'triage_only',
    daily_send_limit: Number(row.daily_send_limit),
    monthly_budget_usd: Number(row.monthly_budget_usd),
    model_classify: row.model_classify,
    model_draft: row.model_draft,
    model_research: row.model_research,
    languages: parseList(row.languages),
    allowed_domains: parseList(row.allowed_domains),
    approved_claims: parseList(row.approved_claims),
    follow_up_gaps_days: parseList(row.follow_up_gaps_days).map(Number).filter(n => n > 0),
    max_follow_ups: Number(row.max_follow_ups),
    timezone: row.timezone,
    budget_alerted_month: row.budget_alerted_month ?? null,
  };
}

@Injectable()
export class SettingsService {
  constructor(private db: EaDb) {}

  async get(sql: Sql = this.db): Promise<AgentSettings> {
    const [row] = await sql.rows('SELECT * FROM ea_settings WHERE id = 1');
    return toSettings(row);
  }

  /** Changes settings and records old and new values in the audit log. */
  async update(actor: Actor, patch: Partial<Record<keyof AgentSettings, any>>): Promise<AgentSettings> {
    return this.db.tx(actor, async tx => {
      const before = await this.get(tx);
      const sets: string[] = [];
      const values: any[] = [];
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        const isList = (LIST_FIELDS as readonly string[]).includes(key) || key === 'follow_up_gaps_days';
        const stored = isList ? (value as any[]).join(key === 'approved_claims' ? '\n' : ',') : value;
        sets.push(`${key} = ?`);
        values.push(stored);
        changes[key] = { from: (before as any)[key], to: value };
      }
      // The first time the pause comes off counts as turning the agent on; from then on mail is polled, even while paused
      if (patch.paused === false && !before.activated_at) {
        sets.push('activated_at = ?');
        values.push(new Date());
      }
      if (!sets.length) return before;
      sets.push('updated_at = ?');
      values.push(new Date());
      await tx.exec(`UPDATE ea_settings SET ${sets.join(', ')} WHERE id = 1`, values);
      await audit(tx, actor, 'settings_change', 'settings', 1, changes);
      return this.get(tx);
    });
  }
}
