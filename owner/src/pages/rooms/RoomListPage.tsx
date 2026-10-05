import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../lib/api';
import { Room, Property } from '../../types';

export const RoomListPage: React.FC = () => {
  const location = useLocation();
  const searchParam = new URLSearchParams(location.search).get('search') || '';
  const { subscription, usage, isRoomBlocked, openQuotaModal, refreshSubscription } = useSubscription();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(searchParam);

  // Modal Add / Edit Room
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('Standar');
  const [roomPrice, setRoomPrice] = useState<number | ''>('');
  const [roomStatus, setRoomStatus] = useState<'available' | 'occupied' | 'maintenance'>('available');
  const [roomDescription, setRoomDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Room
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [roomsRes, propsRes] = await Promise.allSettled([
        api.get('/rooms', { params: { perPage: 100 } }),
        api.get('/properties'),
      ]);

      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.data) {
        setRooms(roomsRes.value.data.data);
      }
      if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
        setProperties(propsRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    if (isRoomBlocked) {
      openQuotaModal('room');
      return;
    }
    setEditingRoomId(null);
    setSelectedPropertyId(properties[0]?.id || '');
    setRoomNumber('');
    setRoomName('');
    setRoomType('Standar');
    setRoomPrice(1000000);
    setRoomStatus('available');
    setRoomDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Room) => {
    setEditingRoomId(r.id);
    setSelectedPropertyId(r.propertyId);
    setRoomNumber(r.roomNumber);
    setRoomName(r.name || '');
    setRoomType(r.type || 'Standar');
    setRoomPrice(r.price);
    setRoomStatus(r.status);
    setRoomDescription(r.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId && isRoomBlocked) {
      setFormError(`Batas kuota kamar tercapai pada paket ${subscription?.plan?.name || 'Trial'}. Silakan upgrade paket.`);
      openQuotaModal('room');
      return;
    }

    if (!selectedPropertyId || !roomNumber || !roomPrice) {
      setFormError('Properti, nomor kamar, dan harga sewa wajib diisi.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      propertyId: selectedPropertyId,
      roomNumber,
      name: roomName || undefined,
      type: roomType,
      price: Number(roomPrice),
      status: roomStatus,
      description: roomDescription || undefined,
    };

    try {
      if (editingRoomId) {
        await api.patch(`/rooms/${editingRoomId}`, payload);
      } else {
        await api.post('/rooms', payload);
      }
      setIsModalOpen(false);
      fetchData();
      refreshSubscription();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal menyimpan kamar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/rooms/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
      refreshSubscription();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus kamar.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.property?.name && r.property.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProperty = !propertyFilter || r.propertyId === propertyFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesProperty && matchesStatus;
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Semua Kamar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap unit kamar kost dari seluruh properti yang Anda kelola.
          </p>
          {usage && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold ${
                isRoomBlocked ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                <span className="material-symbols-outlined text-[14px]">{isRoomBlocked ? 'lock' : 'verified'}</span>
                <span>Batas Kamar Paket {subscription?.plan?.name || 'Trial'}: {usage.rooms.current} / {usage.rooms.limit ?? '∞'} Unit</span>
              </span>
              {isRoomBlocked && (
                <button
                  type="button"
                  onClick={() => openQuotaModal('room')}
                  className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
                >
                  Upgrade Paket →
                </button>
              )}
            </div>
          )}
        </div>

        {isRoomBlocked ? (
          <button
            type="button"
            onClick={() => openQuotaModal('room')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer"
            title="Batas kuota kamar tercapai untuk paket Anda. Klik untuk upgrade paket."
          >
            <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
            <span>+ Tambah Kamar (Batas {usage?.rooms.current}/{usage?.rooms.limit})</span>
          </button>
        ) : (
          <button
            onClick={handleOpenAdd}
            disabled={properties.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Tambah Kamar Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full md:w-80">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor kamar, nama kost..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Property Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none"
          >
            <option value="">Semua Properti Kost</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="available">Kosong (Available)</option>
            <option value="occupied">Terisi (Occupied)</option>
            <option value="maintenance">Perbaikan (Maintenance)</option>
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      {isLoading ? (
        <LoadingSpinner label="Memuat inventaris kamar..." />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon="meeting_room"
          title="Tidak Ada Kamar Ditemukan"
          description={
            searchQuery || propertyFilter || statusFilter !== 'all'
              ? 'Tidak ada kamar yang cocok dengan kriteria filter.'
              : 'Anda belum mendaftarkan unit kamar kost.'
          }
          actionText={
            properties.length > 0
              ? isRoomBlocked
                ? 'Batas Kamar Penuh (Upgrade)'
                : '+ Tambah Kamar Sekarang'
              : undefined
          }
          onAction={isRoomBlocked ? () => openQuotaModal('room') : handleOpenAdd}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Nomor Kamar</th>
                  <th className="px-6 py-4">Properti Kost</th>
                  <th className="px-6 py-4">Tipe & Fasilitas</th>
                  <th className="px-6 py-4">Harga Sewa</th>
                  <th className="px-6 py-4">Status Hunian</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center font-bold text-primary text-sm">
                          {r.roomNumber}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            Kamar {r.roomNumber}
                          </span>
                          {r.name && <span className="text-[11px] text-slate-400">{r.name}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 block">
                        {r.property?.name || 'Properti'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {r.property?.city || 'Kota'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700 block">{r.type || 'Standar'}</span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">
                        {r.description || 'Kamar nyaman siap huni'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatRupiah(r.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal"> /bln</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          r.status === 'available'
                            ? 'info'
                            : r.status === 'occupied'
                            ? 'success'
                            : 'warning'
                        }
                        size="md"
                        dot
                      >
                        {r.status === 'available'
                          ? 'Kosong'
                          : r.status === 'occupied'
                          ? 'Terisi'
                          : 'Maintenance'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Kamar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Kamar"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Room */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoomId ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editingRoomId && isRoomBlocked && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-600">lock</span>
                <span>
                  Batas kuota kamar ({usage?.rooms.limit} kamar) pada paket <strong>{subscription?.plan?.name || 'Trial'}</strong> telah tercapai.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  openQuotaModal('room');
                }}
                className="px-3 py-1 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shrink-0 cursor-pointer"
              >
                Upgrade
              </button>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Pilih Properti Kost *
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              disabled={!!editingRoomId}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor Kamar *
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="contoh: 101, A-02"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama / Label Kamar
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="contoh: Lantai 2 Balkon"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tipe Kamar
              </label>
              <input
                type="text"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="contoh: Standar, VIP"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Harga Sewa / Bulan (Rp) *
              </label>
              <input
                type="number"
                value={roomPrice}
                onChange={(e) => setRoomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1200000"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Status Kamar
            </label>
            <select
              value={roomStatus}
              onChange={(e) => setRoomStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800"
            >
              <option value="available">Kosong (Available)</option>
              <option value="occupied">Terisi (Occupied)</option>
              <option value="maintenance">Perbaikan (Maintenance)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Deskripsi Fasilitas Khusus Kamar
            </label>
            <textarea
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              rows={2}
              placeholder="Deskripsi fasilitas di kamar ini..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || (!editingRoomId && isRoomBlocked)}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>{editingRoomId ? 'Perbarui Kamar' : 'Simpan Kamar'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kamar?"
        message={`Hapus permanen Kamar ${deleteTarget?.roomNumber}? Data riwayat sewa akan terhapus.`}
        confirmText="Hapus Permanen"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
