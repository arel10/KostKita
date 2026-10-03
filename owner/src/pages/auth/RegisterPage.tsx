import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Wizard Step State (1: Profil & Kontak, 2: Akun & Keamanan)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form Fields State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Validation State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper validation for Step 1
  const validateStep1 = (): boolean => {
    setError(null);
    if (!name.trim()) {
      setError('Mohon masukkan nama lengkap atau nama bisnis kost Anda.');
      return false;
    }
    if (name.trim().length < 3) {
      setError('Nama minimal 3 karakter.');
      return false;
    }
    if (phone.trim() && phone.trim().length < 9) {
      setError('Format nomor WhatsApp belum lengkap (minimal 9 digit, cth: 081234567890).');
      return false;
    }
    return true;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setError(null);
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep(1);
  };

  // Submit Handler on Step 2
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Mohon masukkan alamat email aktif.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Format email tidak valid.');
      return;
    }
    if (!password) {
      setError('Mohon masukkan kata sandi.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const result = await register(name, email, password, phone);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Pendaftaran gagal.');
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
      setError(result.message || 'Pendaftaran dengan Google gagal.');
    }
  };

  // Tangkap redirect token dari Google OAuth jika dialihkan kembali
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              alt="KostKita Logo"
              className="h-8 sm:h-9 w-auto object-contain"
              src="/logo.png"
            />
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl text-[#004337] tracking-tight leading-none">
                KostKita
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                PORTAL PEMILIK KOST
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs font-bold text-[#004337] hover:text-[#002f26] hover:underline flex items-center gap-1.5 py-1.5 px-3 rounded-full hover:bg-slate-100 transition"
          >
            <span>Sudah Punya Akun? Masuk</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-24 pb-14 flex-1 flex flex-col justify-center px-4 sm:px-6 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/80 my-4 transition-all">
          
          {/* Top Trial Banner Callout */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Trial Gratis 30 Hari Aktif Otomatis</span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative mb-2">
              {/* Step Connector Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-100 z-0 rounded-full">
                <div 
                  className="h-full bg-[#004337] rounded-full transition-all duration-500 ease-out"
                  style={{ width: currentStep === 1 ? '50%' : '100%' }}
                />
              </div>

              {/* Step 1 Node */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 1
                    ? 'bg-[#004337] text-white shadow-md shadow-[#004337]/20 scale-105'
                    : 'bg-emerald-100 text-[#004337] hover:bg-emerald-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-black">
                  {currentStep === 2 ? '✓' : '1'}
                </span>
                <span>Profil & Kontak</span>
              </button>

              {/* Step 2 Node */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 2
                    ? 'bg-[#004337] text-white shadow-md shadow-[#004337]/20 scale-105'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[11px] font-black">
                  2
                </span>
                <span>Akun & Keamanan</span>
              </button>
            </div>

            {/* Step Helper Text */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1">
              <span>{currentStep === 1 ? 'Langkah 1 dari 2 (50% selesai)' : 'Langkah 2 dari 2 (Hampir Selesai!)'}</span>
              <span>{currentStep === 1 ? 'Hanya butuh nama & nomor WA' : 'Tinggal atur sandi Anda'}</span>
            </div>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
              <span className="material-symbols-outlined text-[20px] shrink-0 text-rose-600">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* ────────────────────────────────────────── */}
          {/* STEP 1: Profil & WhatsApp (Cepat & Ringan) */}
          {/* ────────────────────────────────────────── */}
          {currentStep === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5 animate-fade-in">
              <div className="text-left mb-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Halo Calon Juragan! 👋
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Isi info singkat tentang Anda atau nama kost Anda untuk memulai:
                </p>
              </div>

              {/* Input Nama */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap / Nama Bisnis Kost <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="contoh: H. Syamsuddin atau Kost Griya Asri"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004337]/20 focus:border-[#004337] text-slate-900 transition-all font-sans"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-1">
                  Nama ini akan tampil pada profil kost dan tanda terima sewa resmi.
                </p>
              </div>

              {/* Input WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Aktif <span className="text-slate-400 font-normal normal-case">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    phone
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="contoh: 081234567890"
                    className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004337]/20 focus:border-[#004337] text-slate-900 transition-all font-sans"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-1">
                  Untuk menerima notifikasi booking kamar dan kirim kwitansi otomatis.
                </p>
              </div>

              {/* Action Button: Next Step */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-5 bg-[#004337] hover:bg-[#00342b] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Lanjutkan ke Pengaturan Akun</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              {/* Divider Or Google */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  atau daftar instan 1-klik
                </div>
              </div>

              {/* 1-Click Google Sign-Up */}
              <div>
                <GoogleAuthButton
                  label="Daftar Cepat dengan Google"
                  onSuccess={handleGoogleSuccess}
                  onError={(msg) => setError(msg)}
                  disabled={isLoading}
                />
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────── */}
          {/* STEP 2: Email & Kata Sandi (Akses Akun)   */}
          {/* ────────────────────────────────────────── */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="text-left mb-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Tinggal Satu Langkah Lagi! 🔒
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Masukkan email dan buat kata sandi untuk login ke portal:
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Email Aktif <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh: juragan@gmail.com"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004337]/20 focus:border-[#004337] text-slate-900 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Passwords Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      required
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004337]/20 focus:border-[#004337] text-slate-900 transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ulangi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      required
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#004337]/20 focus:border-[#004337] text-slate-900 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Password Helpers */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#004337] focus:ring-[#004337]"
                  />
                  <span>Tampilkan kata sandi</span>
                </label>

                {password && confirmPassword && (
                  <span className={`text-[11px] font-bold ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {password === confirmPassword ? '✓ Sandi cocok' : '✗ Sandi tidak cocok'}
                  </span>
                )}
              </div>

              {/* Highlight Perks Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs">
                <div className="font-extrabold flex items-center gap-1.5 mb-1 text-[#004337]">
                  <span className="material-symbols-outlined text-[17px]">verified</span>
                  <span>Langsung Nikmati Fasilitas Premium:</span>
                </div>
                <ul className="text-[11px] text-emerald-900/80 space-y-0.5 pl-5 list-disc">
                  <li>Manajemen kamar kost tanpa batasan jumlah unit</li>
                  <li>Bebas kirim pengingat tagihan sewa ke WhatsApp penyewa</li>
                  <li>Gratis 30 hari penuh tanpa biaya admin ataupun kartu kredit</li>
                </ul>
              </div>

              {/* Action Buttons: Back & Complete */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isLoading}
                  className="py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Kembali</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3.5 px-5 bg-[#004337] hover:bg-[#00342b] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Selesaikan & Masuk Dashboard</span>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Login Link */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Sudah terdaftar sebelumnya?{' '}
            <Link to="/login" className="font-extrabold text-[#004337] hover:underline">
              Masuk ke akun Anda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
