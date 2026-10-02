import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const GoogleCallbackPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // 1. Cek access_token di URL hash (#access_token=...)
        const hash = window.location.hash;
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.replace('#', '?'));
          const accessToken = params.get('access_token');
          if (accessToken) {
            const result = await loginWithGoogle(accessToken);
            if (result.success) {
              navigate('/', { replace: true });
              return;
            } else {
              setError(result.message || 'Otentikasi dengan Google gagal.');
              return;
            }
          }
        }

        // 2. Cek credential atau code di URL query string (?credential=... atau ?code=...)
        const searchParams = new URLSearchParams(window.location.search);
        const credential = searchParams.get('credential');
        if (credential) {
          const result = await loginWithGoogle(credential);
          if (result.success) {
            navigate('/', { replace: true });
            return;
          } else {
            setError(result.message || 'Otentikasi dengan Google gagal.');
            return;
          }
        }

        const errorParam = searchParams.get('error');
        if (errorParam) {
          setError(`Google mengembalikan error: ${errorParam}`);
          return;
        }

        setError('Tidak ada token otentikasi yang ditemukan dari Google.');
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan saat memproses otentikasi Google.');
      }
    };

    processCallback();
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 flex flex-col items-center text-center">
        {error ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Gagal Masuk dengan Google</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="py-2.5 px-6 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition-colors shadow-xs"
            >
              Kembali ke Halaman Login
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-primary flex items-center justify-center mb-4 animate-pulse">
              <span className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1.5">Menghubungkan Akun Google...</h2>
            <p className="text-xs text-slate-500">
              Mohon tunggu sebentar, sistem sedang memverifikasi akun Anda.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
