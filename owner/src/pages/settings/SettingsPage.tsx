import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

export const SettingsPage: React.FC = () => {
  const { user, reloadUser } = useAuth();

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      await api.patch('/auth/me', {
        name,
        phone: phone || undefined,
      });
      await reloadUser();
      setProfileMessage({ text: 'Profil berhasil diperbarui.', type: 'success' });
    } catch (err: any) {
      setProfileMessage({
        text: err.response?.data?.error?.message || 'Gagal memperbarui profil.',
        type: 'error',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Konfirmasi kata sandi baru tidak cocok.', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ text: 'Kata sandi baru minimal 8 karakter.', type: 'error' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    try {
      await api.patch('/auth/me/password', {
        oldPassword,
        newPassword,
      });
      setPasswordMessage({ text: 'Kata sandi berhasil diubah.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({
        text: err.response?.data?.error?.message || 'Gagal mengubah kata sandi.',
        type: 'error',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Profil & Keamanan Akun
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Perbarui identitas pemilik kost, nomor kontak WhatsApp, dan kata sandi masuk.
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white font-black text-lg flex items-center justify-center shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || 'O'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Data Diri Pengelola Kost</h2>
            <p className="text-xs text-slate-500">Informasi ini ditampilkan di sistem dan WhatsApp</p>
          </div>
        </div>

        {profileMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
              profileMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {profileMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{profileMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Nama Lengkap / Bisnis *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Alamat Email (Akun)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Nomor WhatsApp Utama
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="contoh: 081234567890"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUpdatingProfile && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Perbarui Kata Sandi Akun</h2>
          <p className="text-xs text-slate-500">Gunakan kombinasi kata sandi yang aman dan tidak mudah ditebak</p>
        </div>

        {passwordMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
              passwordMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {passwordMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Kata Sandi Lama *
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Kata Sandi Baru *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minimal 8 karakter"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Konfirmasi Kata Sandi Baru *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUpdatingPassword && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Ganti Kata Sandi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
