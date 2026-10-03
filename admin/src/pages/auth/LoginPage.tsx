import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user?.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const r = await login(email.trim(), password);
    setBusy(false);
    if (r.success) nav(loc.state?.from ?? '/admin/dashboard', { replace: true });
    else setError(r.message ?? 'Login gagal.');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink-950">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 flex items-center justify-center shadow-glow">
            <span className="material-symbols-outlined fill text-white">shield_person</span>
          </div>
          <span className="text-white text-xl font-extrabold">KostKita</span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-extrabold text-white leading-tight">Kendali penuh<br />atas seluruh platform.</h2>
          <p className="text-ink-300 mt-4 max-w-md leading-relaxed">Kelola owner, listing, paket langganan, dan verifikasi pembayaran dalam satu konsol yang jelas dan aman.</p>
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-md">
            {[['groups', 'Owners'], ['payments', 'Payments'], ['history', 'Audit']].map(([i, l]) => (
              <div key={l} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 backdrop-blur">
                <span className="material-symbols-outlined text-brand-300">{i}</span>
                <p className="text-xs font-bold text-white mt-2">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} KostKita. Area terbatas — hanya Super Admin.</p>
      </div>

      <div className="flex items-center justify-center p-6 bg-ink-50">
        <form onSubmit={submit} className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 flex items-center justify-center">
              <span className="material-symbols-outlined fill text-white">shield_person</span>
            </div>
            <span className="font-extrabold text-xl text-ink-900">KostKita Admin</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Masuk Super Admin</h1>
          <p className="text-sm text-ink-500 mt-1.5 mb-8">Gunakan akun administrator platform.</p>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm ring-1 ring-rose-600/20">
              <span className="material-symbols-outlined text-[18px] mt-px">error</span>
              {error}
            </div>
          )}

          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input mb-4" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kostkita.id" required autoFocus autoComplete="username" />

          <label className="label" htmlFor="password">Password</label>
          <div className="relative mb-6">
            <input id="password" type={show ? 'text' : 'password'} className="input !pr-11" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label="Tampilkan password" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
              <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>

          <button id="login-submit" className="btn-primary w-full !py-3" disabled={busy}>
            {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">login</span>}
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
