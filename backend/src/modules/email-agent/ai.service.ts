import { Inject, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { EaDb, localDay } from './ea-db';
import { SettingsService } from './settings.service';
import { AlertService } from './alert.service';

export type AiRequest = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type AiResponse = Anthropic.Beta.Messages.BetaMessage;

/** The single point where the agent reaches Claude. Tests swap this for a stub. */
export interface AiGateway {
  isConfigured(): boolean;
  create(request: AiRequest): Promise<AiResponse>;
}
export const AI_GATEWAY = Symbol('AI_GATEWAY');

/** Models that accept the server-side refusal fallback in its "default" form. */
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

@Injectable()
export class AnthropicGateway implements AiGateway {
  private client: Anthropic | null = null;

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  create(request: AiRequest): Promise<AiResponse> {
    this.client ??= new Anthropic();
    const fallback = FALLBACK_MODELS.has(request.model as string)
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
      : {};
    return this.client.beta.messages.create({ ...request, ...fallback } as AiRequest);
  }
}

type Price = { input: number; output: number; cacheRead: number };

/** USD per million tokens, from the Claude docs. Editing this table is how new models get a budget price. */
const PRICES: Record<string, Price> = {
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
/** An unlisted model is priced at the most expensive rate, so an unknown can only stop spending early. */
const UNKNOWN_PRICE: Price = { input: 10, output: 50, cacheRead: 1 };
const CACHE_WRITE_MULTIPLIER = 1.25;
const WEB_SEARCH_USD = 0.01;

export function costOf(model: string, usage: any): { cost: number; searches: number } {
  const p = PRICES[model] ?? UNKNOWN_PRICE;
  const searches = Number(usage?.server_tool_use?.web_search_requests ?? 0);
  const cost = (
    (usage?.input_tokens ?? 0) * p.input +
    (usage?.output_tokens ?? 0) * p.output +
    (usage?.cache_read_input_tokens ?? 0) * p.cacheRead +
    (usage?.cache_creation_input_tokens ?? 0) * p.input * CACHE_WRITE_MULTIPLIER
  ) / 1_000_000 + searches * WEB_SEARCH_USD;
  return { cost, searches };
}

export class BudgetExceededError extends Error {}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_GATEWAY) private gateway: AiGateway,
    private db: EaDb,
    private settings: SettingsService,
    private alerts: AlertService,
  ) {}

  isConfigured() {
    return this.gateway.isConfigured();
  }

  private monthKey(timezone: string) {
    return localDay(new Date(), timezone).slice(0, 7);
  }

  async monthSpend(timezone: string): Promise<number> {
    const [row] = await this.db.rows('SELECT COALESCE(SUM(cost_usd), 0) AS total FROM ea_ai_usage WHERE month = ?', [this.monthKey(timezone)]);
    return Number(row.total);
  }

  /** False once this month's spend reaches the budget. Alerts the admin once a month. */
  async budgetAvailable(): Promise<boolean> {
    const s = await this.settings.get();
    if ((await this.monthSpend(s.timezone)) < s.monthly_budget_usd) return true;
    const month = this.monthKey(s.timezone);
    // Compare-and-swap so concurrent workers send one alert between them
    const won = await this.db.exec(
      'UPDATE ea_settings SET budget_alerted_month = ? WHERE id = 1 AND (budget_alerted_month IS NULL OR budget_alerted_month <> ?)',
      [month, month],
    );
    if (won) {
      await this.alerts.notify(
        'Email agent stopped drafting: monthly AI budget reached',
        `The email agent reached its monthly AI budget of USD ${s.monthly_budget_usd}. Drafting and research have stopped. Triage, opt-outs and sending of already approved emails carry on. Raise the budget in Email Agent settings, or it resumes next month.`,
      );
    }
    return false;
  }

  /** Every Claude call goes through here: checks the budget first, records the cost after. */
  async call(purpose: string, ref: string, request: AiRequest): Promise<AiResponse> {
    if (!(await this.budgetAvailable())) throw new BudgetExceededError('Monthly AI budget reached');
    const response = await this.gateway.create(request);
    const s = await this.settings.get();
    const model = response.model || (request.model as string);
    const { cost, searches } = costOf(model, response.usage);
    await this.db.insert('ea_ai_usage', {
      month: this.monthKey(s.timezone), purpose, model,
      input_tokens: response.usage?.input_tokens ?? 0,
      output_tokens: response.usage?.output_tokens ?? 0,
      cache_read_tokens: response.usage?.cache_read_input_tokens ?? 0,
      cache_write_tokens: response.usage?.cache_creation_input_tokens ?? 0,
      web_searches: searches, cost_usd: cost.toFixed(5), ref: ref.slice(0, 60),
    }).catch(err => this.logger.error(`Could not record AI usage: ${err.message}`));
    return response;
  }
}
