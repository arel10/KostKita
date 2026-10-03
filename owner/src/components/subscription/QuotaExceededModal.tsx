import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';

export interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'property' | 'room' | 'tenant';
  current: number;
  limit: number | null;
  planName?: string;
}

export const QuotaExceededModal: React.FC<QuotaExceededModalProps> = ({
  isOpen,
  onClose,
  type,
  current,
  limit,
  planName = 'Trial',
}) => {
  const navigate = useNavigate();

  const config = {
    property: {
      title: 'Batas Kuota Properti Tercapai',
      icon: 'apartment',
      itemLabel: 'properti kost',
      recommendedPlan: 'Pro',
      benefitInfo: 'Paket Pro membuka akses tanpa batas (unlimited) untuk mengelola banyak properti kost sekaligus.',
    },
    room: {
      title: 'Batas Kuota Kamar Tercapai',
      icon: 'meeting_room',
      itemLabel: 'unit kamar kost',
      recommendedPlan: 'Basic atau Pro',
      benefitInfo: 'Tingkatkan paket Anda untuk menambah kapasitas kamar hingga 20 kamar (Basic) atau tanpa batas (Pro).',
    },
    tenant: {
      title: 'Batas Kuota Penyewa Aktif Tercapai',
      icon: 'group',
      itemLabel: 'penyewa aktif',
      recommendedPlan: 'Basic atau Pro',
      benefitInfo: 'Tingkatkan paket Anda untuk mencatat lebih banyak data penghuni kost aktif tanpa hambatan.',
    },
  }[type];

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      description={`Batas benefit paket ${planName}`}
      maxWidth="md"
    >
      <div className="text-center space-y-5">
        {/* Top Icon with Warning Glow */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[36px]">{config.icon}</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-800 text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Batas Paket {planName}: {limit} {config.itemLabel}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {config.title}
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Akun Anda saat ini berada pada paket <strong>{planName}</strong> dan telah mencapai batas maksimal{' '}
            <strong className="text-slate-800 font-bold">{current} dari {limit} {config.itemLabel}</strong>.
          </p>
        </div>

        {/* Upgrade Highlight Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 text-left shadow-xs">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[24px] shrink-0 mt-0.5">
              rocket_launch
            </span>
            <div className="text-xs">
              <h4 className="font-extrabold text-emerald-950">
                Solusi: Upgrade ke Paket {config.recommendedPlan}
              </h4>
              <p className="text-emerald-800/90 mt-1 leading-normal">
                {config.benefitInfo}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upgrade</span>
            <span>Upgrade Paket Sekarang</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
