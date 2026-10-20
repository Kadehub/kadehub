'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ImagePlus, X, MapPin, Wifi, ArrowLeft, ArrowRight } from 'lucide-react';
import { MascotState } from '../../../components/brand/Mascot';
import { CategoryIcon, PageLoader, Spinner, fieldCls } from '../../../components/tasks/ui';
import { productPath } from '../../../lib/platform';
import { useRequireLogin } from '../../../lib/tasks/auth';
import { useTasksT } from '../../../lib/tasks/i18n';
import { apiError } from '../../../lib/tasks/format';
import { DISTRICTS, type Category } from '../../../lib/tasks/types';
import api from '../../../lib/api';

const p = (path: string) => productPath('tasks', path);
const MAX_PHOTOS = 6;

const EMPTY = {
  title: '', category_id: '', description: '',
  location_type: 'in_person' as 'in_person' | 'remote', district: '', city: '',
  due_date: '', flexible: false, budget: '',
};

export default function PostTaskPage() {
  const { t } = useTasksT();
  const { ready } = useRequireLogin();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [postedId, setPostedId] = useState<number | null>(null);

  useEffect(() => {
    api.get<Category[]>('/tasks/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm(f => ({ ...f, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

  function validate(s: number): string | null {
    if (s === 1) {
      if (form.title.trim().length < 10) return t('post.titleShort');
      if (!form.category_id) return t('post.needCategory');
      if (form.description.trim().length < 25) return t('post.descShort');
    }
    if (s === 2 && form.location_type === 'in_person' && !form.district) return t('post.needDistrict');
    if (s === 3 && !(Number(form.budget) >= 500)) return t('post.needBudget');
    return null;
  }

  const next = () => {
    const err = validate(step);
    if (err) return toast.error(err);
    setStep(s => s + 1);
  };

  async function submit() {
    for (const s of [1, 2, 3]) {
      const err = validate(s);
      if (err) { setStep(s); return toast.error(err); }
    }
    setSaving(true);
    try {
      const { data } = await api.post('/tasks', {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        description: form.description.trim(),
        location_type: form.location_type,
        district: form.district || undefined,
        city: form.city.trim() || undefined,
        due_date: form.due_date || undefined,
        flexible: form.flexible || !form.due_date,
        budget: Number(form.budget),
      });
      for (const file of photos) {
        const fd = new FormData();
        fd.append('image', file);
        await api.post(`/tasks/${data.id}/attachments`, fd, { timeout: 60000 }).catch(err => toast.error(apiError(err)));
      }
      setPostedId(data.id);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(apiError(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <PageLoader />;

  if (postedId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="kh-card px-6 py-10">
          <MascotState variant="success" size="md" title={t('success.posted')} description={t('success.postedDesc')}
            action={<>
              <Link href={p(`/t/${postedId}`)} className="px-5 py-2.5 rounded-xl text-sm kh-btn-amber">{t('success.viewTask')}</Link>
              <button onClick={() => { setForm(EMPTY); setPhotos([]); setStep(1); setPostedId(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-ink-200 text-ink-700 hover:bg-ink-50">
                {t('success.postAnother')}
              </button>
            </>} />
        </div>
      </div>
    );
  }

  const stepTitle = [t('post.s1'), t('post.s2'), t('post.s3')][step - 1];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-ink-900">{t('post.title')}</h1>
      <div className="mt-4 flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? '#F59E0B' : '#E2E8F0' }} />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-400">{t('post.step')} {step} {t('post.of')} 3</p>

      <div className="kh-card p-5 sm:p-6 mt-3 space-y-5">
        <h2 className="text-lg font-bold text-ink-900">{stepTitle}</h2>

        {step === 1 && (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink-700">{t('post.taskTitle')}</span>
              <input className={fieldCls} maxLength={150} value={form.title} placeholder={t('post.taskTitlePh')}
                onChange={e => set('title', e.target.value)} />
            </label>
            <div className="space-y-1">
              <span className="text-sm font-medium text-ink-700">{t('post.category')}</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(c => {
                  const on = String(c.id) === form.category_id;
                  return (
                    <button key={c.id} type="button" onClick={() => set('category_id', String(c.id))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                        on ? 'border-amber-dark bg-amber-light text-ink-900 font-semibold' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
                      <CategoryIcon name={c.icon} size={16} className={on ? 'text-amber-dark' : 'text-ink-400'} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink-700">{t('post.description')}</span>
              <textarea className={`${fieldCls} min-h-[140px]`} maxLength={5000} value={form.description}
                placeholder={t('post.descriptionPh')} onChange={e => set('description', e.target.value)} />
              <span className="block text-right text-2xs text-ink-400">{form.description.length}/5000</span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <span className="text-sm font-medium text-ink-700">{t('post.locationType')}</span>
              <div className="grid sm:grid-cols-2 gap-2">
                {([['in_person', MapPin, t('browse.inPerson'), t('post.inPersonD')], ['remote', Wifi, t('browse.remote'), t('post.remoteD')]] as const).map(([val, Icon, label, desc]) => {
                  const on = form.location_type === val;
                  return (
                    <button key={val} type="button" onClick={() => set('location_type', val)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${on ? 'border-amber-dark bg-amber-light' : 'border-ink-200 hover:bg-ink-50'}`}>
                      <Icon size={18} className={on ? 'text-amber-dark mt-0.5' : 'text-ink-400 mt-0.5'} />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">{label}</span>
                        <span className="block text-xs text-ink-500">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink-700">{t('post.district')}</span>
                <select className={fieldCls} value={form.district} onChange={e => set('district', e.target.value)}>
                  <option value="">—</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink-700">{t('post.city')}</span>
                <input className={fieldCls} maxLength={100} value={form.city} placeholder={t('post.cityPh')} onChange={e => set('city', e.target.value)} />
              </label>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-ink-700">{t('post.when')}</span>
              <input type="date" min={today} className={fieldCls} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={form.flexible} onChange={e => set('flexible', e.target.checked)} className="accent-amber-500" />
                {t('post.flexible')}
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink-700">{t('post.budget')}</span>
              <input type="number" min={500} step={100} className={`${fieldCls} text-lg font-bold`} value={form.budget}
                onChange={e => set('budget', e.target.value)} placeholder="5000" />
              <span className="block text-xs text-ink-400">{t('post.budgetHint')}</span>
            </label>
            <div className="space-y-2">
              <span className="text-sm font-medium text-ink-700">{t('post.photos')}</span>
              <div className="flex flex-wrap gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 rounded-xl object-cover" />
                    <button type="button" onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-ink-200 flex items-center justify-center text-ink-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-400 cursor-pointer hover:bg-ink-50">
                    <ImagePlus size={20} />
                    <span className="text-2xs mt-1">{t('post.addPhoto')}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024);
                        setPhotos(ps => [...ps, ...files].slice(0, MAX_PHOTOS));
                        e.target.value = '';
                      }} />
                  </label>
                )}
              </div>
            </div>
            <p className="text-xs text-ink-500 bg-amber-light rounded-lg px-3 py-2">{t('detail.payDirect')}</p>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-50">
              <ArrowLeft size={15} /> {t('post.back')}
            </button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm kh-btn-amber">
              {t('post.next')} <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm kh-btn-amber">
              {saving && <Spinner className="!w-4 !h-4 !border-white !border-t-transparent" />} {t('post.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
