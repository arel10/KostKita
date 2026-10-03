import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Mohon masukkan email dan kata sandi.');
      return;
    }
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login gagal.');
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError(null);
    setIsLoading(true);
    const result = await loginWithGoogle(credential);
    setIsLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login dengan Google gagal.');
    }
  };

  // Tangkap redirect token dari Google OAuth jika pengguna dialihkan kembali
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
        handleGoogleSuccess(accessToken);
      }
    }
  }, []);

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Owner@KostKita2026!');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              alt="KostKita Logo"
              className="h-9 w-auto object-contain"
              src="/logo.png"
            />
            <span className="font-extrabold text-xl text-primary tracking-tight">KostKita</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed ml-1">
              Juragan Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20 pb-12 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-6">
          {/* Left Column: Branding and Highlights */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-primary-container text-white rounded-3xl p-8 lg:p-10 relative overflow-hidden shadow-xl">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-fixed/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary-container/15 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md self-start text-xs font-semibold text-primary-fixed">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sistem Operasional Kost #1 Indonesia</span>
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Kelola Properti Lebih Nyaman & Terukur.
                </h1>
                <p className="text-xs lg:text-sm text-emerald-100/80 mt-2.5 leading-relaxed">
                  Platform all-in-one juragan modern untuk otomatisasi pencatatan sewa, tagihan WhatsApp, dan laporan okupansi real-time.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] text-emerald-300">verified</span>
                  <span>Bebas Komisi Sewa</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] text-emerald-300">send_time_extension</span>
                  <span>Pengingat WA Otomatis</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] text-emerald-300">corporate_fare</span>
                  <span>Kelola Multi-Kost</span>
                </div>
              </div>
            </div>

            {/* Testimonial Widget */}
            {/* <div className="relative z-10 mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
              <div className="flex items-center gap-1 text-amber-300 pb-2">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined fill text-[16px]">star</span>
                ))}
              </div>
              <p className="text-xs text-white/90 italic leading-relaxed">
                “Sejak pakai KostKita, kontrol keterisian kamar dan pencatatan pembayaran sewa jadi serba rapi dan bebas repot.”
              </p>
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-white/10">
                <div className="w-7 h-7 rounded-full bg-white text-primary flex items-center justify-center font-bold text-xs">
                  H
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Hj. Rosmawati S.E.</p>
                  <p className="text-[11px] text-emerald-200">Owner Kost Melati Residence Padang</p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Right Column: Login Form */}
          <div className="lg:col-span-7 flex flex-col justify-center bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-slate-100">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Masuk ke Portal Juragan
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan email dan kata sandi akun pemilik kost Anda.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Google Sign-In */}
              <div className="mb-4">
                <GoogleAuthButton
                  label="Masuk dengan Akun Google"
                  onSuccess={handleGoogleSuccess}
                  onError={(msg) => setError(msg)}
                  disabled={isLoading}
                />
              </div>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  atau dengan email
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: juragan@kostkita.id"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kata Sandi
                    </label>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Masuk Sekarang</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Registration Link */}
              <div className="mt-6 text-center text-xs text-slate-600">
                Belum punya akun juragan?{' '}
                <Link to="/register" className="font-bold text-primary hover:underline">
                  Daftar Akun Baru (Gratis Trial 30 Hari)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
