'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, ErrorState, PageLoader, StatusBadge } from '../../../../components/tasks/ui';
import { productPath } from '../../../../lib/platform';
import { useRequireLogin } from '../../../../lib/tasks/auth';
import { useTasksT } from '../../../../lib/tasks/i18n';
import { apiError, lkr } from '../../../../lib/tasks/format';
import type { MessageView, PublicUser, TaskStatus } from '../../../../lib/tasks/types';
import api from '../../../../lib/api';

const p = (path: string) => productPath('tasks', path);
const POLL_MS = 5000;

interface Conversation {
  task: { id: number; title: string; status: TaskStatus; agreed_amount: number | null; is_poster: boolean };
  other: PublicUser | null;
  can_send: boolean;
  messages: MessageView[];
}

export default function ConversationPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { t } = useTasksT();
  const { ready } = useRequireLogin();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(() =>
    api.get<Conversation>(`/tasks/${taskId}/messages`)
      .then(r => { setConv(r.data); setError(null); })
      .catch(err => setError(apiError(err, t('common.error')))), [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [ready, load]);

  // Scroll to the newest message only when the count grows
  useEffect(() => {
    const n = conv?.messages.length || 0;
    if (n > lastCount.current) bottomRef.current?.scrollIntoView({ behavior: lastCount.current ? 'smooth' : 'auto' });
    lastCount.current = n;
  }, [conv?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !conv) return;
    setSending(true);
    try {
      const { data } = await api.post<MessageView>(`/tasks/${taskId}/messages`, { body: text });
      setConv(c => c ? { ...c, messages: [...c.messages, data] } : c);
      setBody('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  }

  if (!ready || (!conv && !error)) return <PageLoader />;
  if (!conv) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <ErrorState title={t('common.error')} text={error || t('common.errorDesc')}
          action={<Link href={p('/messages')} className="px-4 py-2 rounded-xl text-sm kh-btn-amber">{t('msg.back')}</Link>} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href={p('/messages')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft size={15} /> {t('msg.back')}
      </Link>

      <div className="kh-card mt-3 flex flex-col" style={{ height: 'calc(100vh - 210px)', minHeight: 420 }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-100">
          <Avatar name={conv.other?.name} url={conv.other?.photo_url} size={38} />
          <div className="flex-1 min-w-0">
            <Link href={p(`/u/${conv.other?.id}`)} className="block text-sm font-bold text-ink-900 truncate hover:underline">{conv.other?.name}</Link>
            <Link href={p(`/t/${conv.task.id}`)} className="block text-xs text-ink-500 truncate hover:underline">{conv.task.title}</Link>
          </div>
          <div className="text-right flex-shrink-0">
            <StatusBadge status={conv.task.status} />
            {conv.task.agreed_amount !== null && <p className="mt-1 text-xs font-bold text-ink-700">{lkr(conv.task.agreed_amount)}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-ink-50">
          {conv.messages.length === 0 && <p className="text-center text-sm text-ink-400 py-8">{t('msg.noMessages')}</p>}
          {conv.messages.map(m => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line break-words ${
                m.mine ? 'text-white rounded-br-md' : 'bg-white border border-ink-100 text-ink-800 rounded-bl-md'}`}
                style={m.mine ? { background: '#F59E0B' } : undefined}>
                {m.body}
                <span className={`block mt-0.5 text-2xs ${m.mine ? 'text-white/75' : 'text-ink-400'}`}>
                  {new Date(m.created_at).toLocaleString('en-LK', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {conv.can_send ? (
          <form onSubmit={send} className="flex gap-2 p-3 border-t border-ink-100">
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={1} maxLength={2000} placeholder={t('msg.placeholder')}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
              className="flex-1 resize-none border border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-dark" />
            <button type="submit" disabled={sending || !body.trim()} className="px-4 rounded-xl kh-btn-amber" aria-label={t('msg.send')}>
              <Send size={17} />
            </button>
          </form>
        ) : (
          <p className="p-3 text-center text-sm text-ink-400 border-t border-ink-100">{t('msg.closed')}</p>
        )}
      </div>
    </div>
  );
}
