'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import api from '../../../lib/api';
import { useHrT } from '../../../lib/hr/i18n';
import type { HrSettings } from '../../../lib/hr/types';
import { hrHref, useHr } from '../../../components/hr/HrContext';
import { LoadError, Loading, PageHeader, Tabs, btnClass } from '../../../components/hr/ui';
import { OwnerOnly } from '../../../components/hr/people/bits';
import { BusinessForm, PayrollForm, RulesForm } from '../../../components/hr/people/SettingsForms';
import { BranchesTab, HolidaysTab, LeaveTypesTab, ManagersTab, ShiftsTab } from '../../../components/hr/people/SettingsLists';

const TABS = ['business', 'rules', 'payroll', 'branches', 'managers', 'leave', 'holidays', 'shifts'] as const;
type Tab = (typeof TABS)[number];

// staff.kadehub.com/settings?tab=… — owner only
export default function SettingsPage() {
  const { t } = useHrT();
  const { owner } = useHr();
  const [tab, setTabState] = useState<Tab>('business');
  const [settings, setSettings] = useState<HrSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const saved = (s: HrSettings) => { setSettings(s); setVersion(v => v + 1); };

  // Read ?tab= on the client (no useSearchParams, so the page needs no Suspense boundary)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q && (TABS as readonly string[]).includes(q)) setTabState(q as Tab);
  }, []);

  const setTab = (next: Tab) => {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  };

  const load = useCallback(async () => {
    setFailed(false);
    try { setSettings((await api.get<HrSettings>('/hr/settings')).data); } catch { setFailed(true); }
  }, []);
  useEffect(() => { if (owner) load(); }, [owner, load]);

  if (!owner) return <OwnerOnly title={t('set.ownerOnlyTitle')} body={t('set.ownerOnlyBody')} />;

  const needsSettings = tab === 'business' || tab === 'rules' || tab === 'payroll';
  const labels: Record<Tab, string> = {
    business: t('set.tab.business'), rules: t('set.tab.rules'), payroll: t('set.tab.payroll'), branches: t('set.tab.branches'),
    managers: t('set.tab.managers'), leave: t('set.tab.leave'), holidays: t('set.tab.holidays'), shifts: t('set.tab.shifts'),
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t('set.title')} subtitle={t('set.subtitle')}
        actions={<Link href={hrHref('/activity')} className={btnClass('outline', 'sm')}><History /> {t('set.activity')}</Link>} />
      <Tabs<Tab> value={tab} onChange={setTab} items={TABS.map(v => ({ value: v, label: labels[v] }))} />
      <div className="max-w-3xl">
        {needsSettings && (failed ? <LoadError onRetry={load} /> : !settings ? <Loading /> : (
          <>
            {/* key: a fresh form after each save, so inputs show the stored values */}
            {tab === 'business' && <BusinessForm key={version} settings={settings} onSaved={saved} />}
            {tab === 'rules' && <RulesForm key={version} settings={settings} onSaved={saved} />}
            {tab === 'payroll' && <PayrollForm key={version} settings={settings} onSaved={saved} />}
          </>
        ))}
        {tab === 'branches' && <BranchesTab />}
        {tab === 'managers' && <ManagersTab />}
        {tab === 'leave' && <LeaveTypesTab />}
        {tab === 'holidays' && <HolidaysTab />}
        {tab === 'shifts' && <ShiftsTab />}
      </div>
    </div>
  );
}
