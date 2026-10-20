'use client';
/** Tap-to-add / edit sheet for business and personal expenses (shared entry kit, shared Modal). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button, TextArea, TextInput, cn } from './ui';
import { AmountDisplay, CategoryTiles, ChipRow, DuplicatePanel, Keypad, WhenChips, type TileOption } from './expense-kit/EntryKit';
import { categoryIcon } from './expense-kit/icons';
import api from '../../lib/api';
import { useT } from '../../lib/cod/i18n/client';
import { expenseCategoryLabel } from '../../lib/cod/business-types';
import { formatLKR } from '../../lib/cod/format';
import { apiError } from '../../lib/cod/session';
import { amountToKeypad, keypadValue } from '../../lib/cod/expenses/keypad';
import { addDays, localToday } from '../../lib/cod/expenses/dates';
import { lastMethod, quickAmounts } from '../../lib/cod/expenses/suggest';
import { newClientRef } from '../../lib/cod/expenses/client-ref';
import {
  BUSINESS_CATEGORIES, BUSINESS_DEFAULT_AMOUNTS, BUSINESS_FALLBACK_AMOUNTS, BUSINESS_TOUR, PAYMENT_METHODS,
  PERSONAL_CATEGORIES, PERSONAL_DEFAULT_AMOUNTS, PERSONAL_FALLBACK_AMOUNTS, categoryColor,
  type BusinessExpense, type PersonalExpense,
} from '../../lib/cod/expenses/types';

export type ExpenseKind = 'business' | 'personal';
type Row = BusinessExpense | PersonalExpense;

type Translator = ReturnType<typeof useT>;

export function categoryLabel(t: Translator, kind: ExpenseKind, category: string) {
  return kind === 'business' ? expenseCategoryLabel(t, category) : t.lookup('pcat', category);
}

/** Readable message for an expenses API error (own codes first, then the shared COD mapper). */
export function expenseError(err: unknown, t: Translator): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  const code = Array.isArray(msg) ? msg[0] : msg;
  if (code === 'EXPENSE_AMOUNT') return t('xp.errAmount');
  if (code === 'EXPENSE_DATE' || code === 'EXPENSE_DATE_FUTURE') return t('xp.errDate');
  return apiError(err, t);
}

/** Undo toast after a create: deletes the new row. */
export function undoToast(t: Translator, text: string, onUndo: () => Promise<void>) {
  toast.custom(tt => (
    <div className={cn('flex items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-lg', tt.visible ? 'opacity-100' : 'opacity-0')}>
      <span>{text}</span>
      <button type="button" className="font-bold text-amber-300 underline underline-offset-4"
        onClick={async () => { toast.dismiss(tt.id); await onUndo(); }}>
        {t('xp.undo')}
      </button>
    </div>
  ), { duration: 6000 });
}

export interface SheetState { kind: ExpenseKind; category?: string; editing?: Row }

export default function ExpenseSheet({ state, onClose, history, onChanged }: {
  state: SheetState | null;
  onClose: () => void;
  /** Rows of the same kind, newest first (quick amounts, last method). */
  history: Row[];
  /** Called after any create / update / delete / undo so the page reloads its totals. */
  onChanged: () => void;
}) {
  const t = useT();
  const open = !!state;
  const kind: ExpenseKind = state?.kind ?? 'business';
  const editing = state?.editing;
  const today = localToday();
  const yesterday = addDays(today, -1);
  const categories: readonly string[] = kind === 'business' ? BUSINESS_CATEGORIES : PERSONAL_CATEGORIES;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(categories[0]);
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState('cash');
  const [details, setDetails] = useState(false);
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [clientRef, setClientRef] = useState('');
  const [dup, setDup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();

  // Reset every time the sheet opens (a new client_ref per opening = one submission)
  useEffect(() => {
    if (!state) return;
    const e = state.editing;
    setAmount(e ? amountToKeypad(Number(e.amount)) : '');
    setCategory(e?.category ?? state.category ?? categories[0]);
    setDate(e?.expense_date ?? localToday());
    setMethod(e?.payment_method ?? lastMethod(history));
    const b = e as BusinessExpense | undefined;
    setTitle(state.kind === 'business' && b && b.title !== b.category ? b.title : '');
    setVendor(b?.vendor ?? '');
    setReference(b?.reference ?? '');
    setNote(e?.notes ?? '');
    setDetails(!!(e && (e.notes || b?.vendor || b?.reference || (state.kind === 'business' && b && b.title !== b.category))));
    setClientRef(newClientRef());
    setDup(null);
    setError(undefined);
    setConfirmDelete(false);
    setSaving(false);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = keypadValue(amount);
  const tileOptions: TileOption[] = useMemo(() => categories.map(c => ({
    value: c, label: categoryLabel(t, kind, c), icon: categoryIcon(kind, c), color: categoryColor(c),
  })), [categories, kind, t]);
  // An older business row may use a category that isn't a tile any more: keep it selectable
  if (editing && !categories.includes(editing.category)) {
    tileOptions.push({ value: editing.category, label: categoryLabel(t, kind, editing.category), icon: categoryIcon(kind, editing.category), color: categoryColor(editing.category) });
  }
  const chips = useMemo(() => quickAmounts(
    history, category,
    kind === 'business' ? BUSINESS_DEFAULT_AMOUNTS[category] ?? BUSINESS_FALLBACK_AMOUNTS : PERSONAL_DEFAULT_AMOUNTS[category] ?? PERSONAL_FALLBACK_AMOUNTS,
  ), [history, category, kind]);

  const endpoint = kind === 'business' ? '/cod/expenses' : '/cod/personal-expenses';

  const submit = useCallback(async (allowDuplicate = false) => {
    if (!(value > 0) || saving) return;
    setSaving(true);
    setError(undefined);
    const body = kind === 'business'
      ? { category, amount: value, expense_date: date, payment_method: method, title: title || undefined, vendor: vendor || null, reference: reference || null, notes: note || null, allow_duplicate: allowDuplicate }
      : { category, amount: value, expense_date: date, payment_method: method, note: note || null, client_ref: editing ? undefined : clientRef, allow_duplicate: allowDuplicate };
    try {
      const { data } = editing ? await api.patch(`${endpoint}/${editing.id}`, body) : await api.post(endpoint, body);
      if (data?.duplicate) {
        setDup(kind === 'business'
          ? t('xp.dupBusiness', { title: title.trim() || categoryLabel(t, kind, category), amount: formatLKR(value) })
          : t('xp.dupPersonal', { category: categoryLabel(t, kind, category), amount: formatLKR(value) }));
        return;
      }
      onClose();
      onChanged();
      if (editing) toast.success(t('xp.updated'));
      else {
        const newId = data.id as number;
        undoToast(t, t('xp.addedAmount', { category: categoryLabel(t, kind, category), amount: formatLKR(value) }), async () => {
          try { await api.delete(`${endpoint}/${newId}`); toast.success(t('xp.undone')); onChanged(); }
          catch (err) { toast.error(expenseError(err, t)); }
        });
      }
    } catch (err) {
      setError(expenseError(err, t));
    } finally {
      setSaving(false);
    }
  }, [value, saving, kind, category, date, method, title, vendor, reference, note, editing, clientRef, endpoint, onClose, onChanged, t]);

  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try {
      await api.delete(`${endpoint}/${editing.id}`);
      toast.success(t('xp.deleted'));
      onClose();
      onChanged();
    } catch (err) {
      setError(expenseError(err, t));
    } finally {
      setSaving(false);
    }
  }

  const heading = editing
    ? t(kind === 'business' ? 'xp.editBusiness' : 'xp.editPersonal')
    : t(kind === 'business' ? 'xp.addBusiness' : 'xp.addPersonal');

  return (
    <Modal open={open} onClose={onClose} title={heading} width="max-w-lg">
      <form onSubmit={e => { e.preventDefault(); submit(false); }} className="space-y-4">
        <AmountDisplay value={amount} label={t('xp.amount')} />

        <CategoryTiles label={t('common.category')} options={tileOptions} value={category} onChange={c => { setCategory(c); setDup(null); }}
          columns={kind === 'business' ? 5 : 4} />
        {kind === 'business' && category === BUSINESS_TOUR && (
          <p className="-mt-2 text-xs text-ink-500">{t('xp.tourHint')}</p>
        )}
        {kind === 'personal' && (
          <p className="-mt-2 text-xs text-ink-500">{t.lookup('pcatHint', category)}</p>
        )}

        <ChipRow label={t('xp.quickAmounts')} value={value > 0 ? value : null}
          options={chips.map(a => ({ value: a, label: formatLKR(a).replace(/\.00$/, '') }))}
          onChange={a => { setAmount(amountToKeypad(a)); setDup(null); }} />

        <Keypad value={amount} onChange={v => { setAmount(v); setDup(null); }} onSubmit={() => submit(false)} active={open} backLabel={t('xp.keypadBack')} />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-500">{t('xp.when')}</p>
          <WhenChips value={date} onChange={d => { setDate(d); setDup(null); }} today={today} yesterday={yesterday}
            labels={{ today: t('xp.today'), yesterday: t('xp.yesterday'), pick: t('xp.pickDate'), group: t('xp.when') }} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-500">{t('xp.paidBy')}</p>
          <ChipRow label={t('xp.paidBy')} value={method} onChange={v => setMethod(String(v))}
            options={PAYMENT_METHODS.map(m => ({ value: m as string, label: t(`pm.${m}` as const) }))} />
        </div>

        <div>
          <button type="button" onClick={() => setDetails(d => !d)} aria-expanded={details}
            className="flex min-h-[40px] w-full items-center justify-between rounded-lg px-1 text-sm font-semibold text-ink-600 hover:text-ink-900">
            {t(kind === 'business' ? 'xp.moreDetails' : 'xp.addNote')}
            <ChevronDown size={16} className={cn('transition-transform', details && 'rotate-180')} />
          </button>
          {details && (kind === 'business' ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TextInput className="col-span-2" placeholder={t('xp.titlePh')} aria-label={t('xp.titlePh')} value={title} maxLength={255} onChange={e => { setTitle(e.target.value); setDup(null); }} />
              <TextInput placeholder={t('xp.vendor')} aria-label={t('xp.vendor')} value={vendor} maxLength={150} onChange={e => setVendor(e.target.value)} />
              <TextInput placeholder={t('xp.reference')} aria-label={t('xp.reference')} value={reference} maxLength={100} onChange={e => setReference(e.target.value)} />
              <TextArea className="col-span-2" rows={2} placeholder={t('xp.note')} aria-label={t('xp.note')} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} />
            </div>
          ) : (
            <TextArea className="mt-2" rows={2} placeholder={t('xp.note')} aria-label={t('xp.note')} value={note} maxLength={500} onChange={e => { setNote(e.target.value); setDup(null); }} />
          ))}
        </div>

        {dup && (
          <DuplicatePanel message={dup} busy={saving} onCancel={() => setDup(null)} onConfirm={() => submit(true)}
            labels={{ title: t('xp.dupTitle'), no: t('xp.dupNo'), yes: t('xp.dupYes') }} />
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          {editing && (
            <Button variant={confirmDelete ? 'danger' : 'outline'} className="min-h-[44px]" onClick={remove} disabled={saving}>
              {confirmDelete ? t('xp.deleteConfirm') : t('xp.delete')}
            </Button>
          )}
          <Button type="submit" className="min-h-[44px] flex-1 justify-center" disabled={!(value > 0) || saving || !!dup}>
            {saving ? t('common.saving') : t(editing ? 'xp.saveCta' : 'xp.addCta', { amount: formatLKR(value).replace(/\.00$/, '') })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
