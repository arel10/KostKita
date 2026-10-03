import React, { useState } from 'react';
import { Modal } from './Modal';

interface ConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => unknown;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  tone?: 'primary' | 'danger';
}

export const ConfirmDialog: React.FC<ConfirmProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Ya, Lanjutkan', tone = 'primary' }) => {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="text-sm text-ink-600 leading-relaxed">{message}</div>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>Batal</button>
        <button className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={run} disabled={busy}>
          {busy ? 'Memproses…' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

interface ReasonProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => unknown;
  title: string;
  description?: string;
  placeholder?: string;
  submitText?: string;
  minLength?: number;
}

export const ReasonDialog: React.FC<ReasonProps> = ({ isOpen, onClose, onSubmit, title, description, placeholder = 'Tuliskan alasan…', submitText = 'Kirim', minLength = 5 }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= minLength;

  const close = () => { setReason(''); onClose(); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try { await onSubmit(reason.trim()); setReason(''); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} description={description} maxWidth="md">
      <form onSubmit={submit}>
        <label className="label" htmlFor="reason-input">Alasan (wajib, min. {minLength} karakter)</label>
        <textarea id="reason-input" className="input min-h-[110px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Batal</button>
          <button type="submit" className="btn-danger" disabled={!valid || busy}>{busy ? 'Memproses…' : submitText}</button>
        </div>
      </form>
    </Modal>
  );
};
