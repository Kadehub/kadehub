'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, MessageSquare, Plus, Menu, X, LogOut, UserRound, LayoutGrid, Home, Search, ClipboardList, ChevronDown } from 'lucide-react';
import KadeHubLogo from '../ui/KadeHubLogo';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useAuthStore } from '../../hooks/useAuth';
import { useViewer } from '../../lib/tasks/auth';
import { useTasksT } from '../../lib/tasks/i18n';
import { PRODUCTS, hubUrl, productPath, productUrl } from '../../lib/platform';
import api from '../../lib/api';
import { Avatar } from './ui';

import { onColor } from '../../lib/color';
const p = (path: string) => productPath('tasks', path);

/** Top navigation for every KadeHub Tasks page (public and signed-in). */
export default function TasksShell({ children }: { children: React.ReactNode }) {
  const { t } = useTasksT();
  const { signedIn, user } = useViewer();
  const logout = useAuthStore(s => s.logout);
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!signedIn) return;
    const load = () => api.get('/tasks/me/notifications/unread-count').then(r => setUnread(r.data?.count || 0)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [signedIn, pathname]);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const signOut = () => { logout(); window.location.href = p('/'); };

  // pathname is the internal one on subdomains (/tasks/browse) — compare on the tail
  const active = (path: string) => pathname.endsWith(path) || pathname.includes(`${path}/`);
  const navLink = (path: string, label: string, Icon: any) => (
    <Link href={p(path)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
        active(path) ? 'bg-amber-light text-amber-dark' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}>
      <Icon size={16} /> {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={hubUrl('/')} aria-label={t('nav.kadehubHome')}><KadeHubLogo width={118} theme="color" /></a>
            <Link href={p('/')} className="text-xs font-extrabold px-2 py-0.5 rounded-md" style={{ background: '#F59E0B', color: onColor('#F59E0B') }}>Tasks</Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {navLink('/browse', t('nav.browse'), Search)}
            {signedIn && navLink('/my-tasks', t('nav.myTasks'), ClipboardList)}
            {signedIn && navLink('/messages', t('nav.messages'), MessageSquare)}
          </nav>

          <div className="flex-1" />

          <Link href={p('/post')} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm kh-btn-amber">
            <Plus size={16} /> {t('nav.post')}
          </Link>

          <div className="hidden sm:block"><LanguageSwitcher /></div>

          {signedIn ? (
            <>
              <Link href={p('/notifications')} className="relative p-2 rounded-xl text-ink-500 hover:bg-ink-50" title={t('nav.notifications')}>
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-2xs font-bold text-white flex items-center justify-center bg-coral">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
              <div ref={menuRef} className="relative hidden lg:block">
                <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-ink-50">
                  <Avatar name={user?.name} size={32} />
                  <ChevronDown size={14} className="text-ink-400" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 kh-card p-1.5 z-40">
                    <p className="px-3 py-2 text-sm font-bold text-ink-800 truncate">{user?.name}</p>
                    <Link href={p('/profile')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                      <UserRound size={15} /> {t('nav.profile')}
                    </Link>
                    {user && (
                      <Link href={p(`/u/${user.id}`)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                        <UserRound size={15} /> {t('nav.publicProfile')}
                      </Link>
                    )}
                    <div className="my-1 border-t border-ink-100" />
                    <p className="px-3 pt-1 pb-1 text-2xs font-semibold uppercase tracking-widest text-ink-400">{t('nav.apps')}</p>
                    {PRODUCTS.filter(pr => pr.slug !== 'tasks').map(pr => (
                      <a key={pr.slug} href={productUrl(pr.slug)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                        <span className="w-5 h-5 rounded-md text-2xs font-extrabold flex items-center justify-center" style={{ background: pr.color, color: onColor(pr.color) }}>
                          {pr.name.replace('KadeHub ', '')[0]}
                        </span>
                        {pr.name}
                      </a>
                    ))}
                    <a href={hubUrl('/account')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                      <UserRound size={15} /> {t('nav.account')}
                    </a>
                    <a href={hubUrl('/apps')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                      <LayoutGrid size={15} /> {t('nav.apps')}
                    </a>
                    <a href={hubUrl('/')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-ink-50">
                      <Home size={15} /> {t('nav.kadehubHome')}
                    </a>
                    <div className="my-1 border-t border-ink-100" />
                    <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-600 hover:bg-red-50 hover:text-red-600">
                      <LogOut size={15} /> {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <a href="/login" className="px-3 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-ink-50">{t('nav.signIn')}</a>
              <Link href={p('/register')} className="px-3 py-2 rounded-xl text-sm font-bold border-2"
                style={{ borderColor: '#F59E0B', color: '#B45309' }}>{t('nav.signUp')}</Link>
            </div>
          )}

          <button className="lg:hidden p-2 rounded-xl text-ink-600 hover:bg-ink-50" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-ink-100 bg-white px-4 py-3 space-y-1">
            <Link href={p('/post')} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm kh-btn-amber">
              <Plus size={16} /> {t('nav.post')}
            </Link>
            <Link href={p('/browse')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.browse')}</Link>
            <a href={hubUrl('/')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.kadehubHome')}</a>
            {signedIn ? (
              <>
                <Link href={p('/my-tasks')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.myTasks')}</Link>
                <Link href={p('/messages')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.messages')}</Link>
                <Link href={p('/profile')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.profile')}</Link>
                <a href={hubUrl('/account')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.account')}</a>
                <a href={hubUrl('/apps')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.apps')}</a>
                <button onClick={signOut} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50">{t('nav.signOut')}</button>
              </>
            ) : (
              <>
                <a href="/login" className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-50">{t('nav.signIn')}</a>
                <Link href={p('/register')} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-dark hover:bg-ink-50">{t('nav.signUp')}</Link>
              </>
            )}
            <div className="pt-2"><LanguageSwitcher /></div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-400">
          <span>© {new Date().getFullYear()} KadeHub Tasks</span>
          <a href={hubUrl('/')} className="hover:text-ink-600">kadehub.com</a>
        </div>
      </footer>
    </div>
  );
}
