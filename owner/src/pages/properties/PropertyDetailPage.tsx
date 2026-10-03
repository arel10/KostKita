import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../lib/api';
import { Property, Room } from '../../types';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const context = useOutletContext<{ refreshGlobal: () => void }>();
  const { subscription, usage, isRoomBlocked, openQuotaModal, refreshSubscription } = useSubscription();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rooms' | 'info'>('rooms');

  // Room modal state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('Standar');
  const [roomPrice, setRoomPrice] = useState<number | ''>('');
  const [roomStatus, setRoomStatus] = useState<'available' | 'occupied' | 'maintenance'>('available');
  const [roomDescription, setRoomDescription] = useState('');
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Delete Room Dialog
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const fetchPropertyData = async () => {
    setIsLoading(true);
    try {
      const [propRes, roomsRes] = await Promise.allSettled([
        api.get(`/properties/${id}`),
        api.get(`/rooms?propertyId=${id}`),
      ]);

      if (propRes.status === 'fulfilled' && propRes.value.data?.data) {
        setProperty(propRes.value.data.data);
      }
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.data) {
        setRooms(roomsRes.value.data.data);
      }
    } catch (e) {
      console.error('Error fetching property detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPropertyData();
    }
  }, [id]);

  const handleOpenAddRoom = () => {
    if (isRoomBlocked) {
      openQuotaModal('room');
      return;
    }
    setEditingRoomId(null);
    setRoomNumber('');
    setRoomName('');
    setRoomType('Standar');
    setRoomPrice(property?.priceStart || 1000000);
    setRoomStatus('available');
    setRoomDescription('');
    setRoomError(null);
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (r: Room) => {
    setEditingRoomId(r.id);
    setRoomNumber(r.roomNumber);
    setRoomName(r.name || '');
    setRoomType(r.type || 'Standar');
    setRoomPrice(r.price);
    setRoomStatus(r.status);
    setRoomDescription(r.description || '');
    setRoomError(null);
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomId && isRoomBlocked) {
      setRoomError(`Batas kuota kamar tercapai pada paket ${subscription?.plan?.name || 'Trial'}. Silakan upgrade paket.`);
      openQuotaModal('room');
      return;
    }

    if (!roomNumber || !roomPrice) {
      setRoomError('Nomor kamar dan harga sewa wajib diisi.');
      return;
    }
    setIsSavingRoom(true);
    setRoomError(null);

    const payload = {
      propertyId: id,
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
        await api.post(`/rooms`, payload);
      }
      setIsRoomModalOpen(false);
      fetchPropertyData();
      context?.refreshGlobal?.();
      refreshSubscription();
    } catch (err: any) {
      setRoomError(err.response?.data?.error?.message || 'Gagal menyimpan kamar.');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    setIsDeletingRoom(true);
    try {
      await api.delete(`/rooms/${deleteRoomTarget.id}`);
      setDeleteRoomTarget(null);
      fetchPropertyData();
      context?.refreshGlobal?.();
      refreshSubscription();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus kamar.');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading || !property) {
    return <LoadingSpinner label="Memuat detail properti kost..." />;
  }

  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header with Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 mb-1 text-xs text-slate-500">
            <Link to="/properties" className="hover:text-primary">Daftar Properti</Link>
            <span>/</span>
            <span className="text-primary font-bold">{property.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {property.name}
            </h1>
            <Badge
              variant={property.status === 'active' ? 'success' : 'neutral'}
              size="md"
              dot
            >
              {property.status === 'active' ? 'Tayang Publik' : property.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
            <span>{property.address}, {property.city}, {property.province}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/properties/${property.id}/edit`}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span>Ubah Profil</span>
          </Link>

          {isRoomBlocked ? (
            <button
              type="button"
              onClick={() => openQuotaModal('room')}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Batas kuota kamar tercapai untuk paket Anda. Klik untuk upgrade paket."
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
              <span>+ Tambah Kamar ({usage?.rooms.current}/{usage?.rooms.limit})</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddRoom}
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Tambah Kamar</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Kamar</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{rooms.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Unit terdaftar</span>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[11px] text-emerald-600 font-bold uppercase block">Kamar Terisi</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">{occupiedCount}</span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">{occupancyRate}% Okupansi</span>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 shadow-sm text-center">
          <span className="text-[11px] text-blue-600 font-bold uppercase block">Kamar Kosong</span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 block">{availableCount}</span>
          <span className="text-[11px] text-blue-600 mt-1 block">Siap disewa</span>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 shadow-sm text-center">
          <span className="text-[11px] text-amber-700 font-bold uppercase block">Perbaikan (Maint.)</span>
          <span className="text-2xl font-extrabold text-amber-800 mt-0.5 block">{maintenanceCount}</span>
          <span className="text-[11px] text-amber-700 mt-1 block">Perlu renovasi</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
            activeTab === 'rooms'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Daftar Kamar ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
            activeTab === 'info'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Fasilitas & Info Properti
        </button>
      </div>

      {/* Tab 1: Rooms Table */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {rooms.length === 0 ? (
            <EmptyState
              icon="meeting_room"
              title="Belum Ada Kamar"
              description="Tambahkan kamar pertama untuk properti kost ini agar bisa diisi oleh penyewa."
              actionText="+ Tambah Kamar Baru"
              onAction={handleOpenAddRoom}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="px-6 py-4">Nomor / Nama Kamar</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4">Harga Sewa</th>
                    <th className="px-6 py-4">Status Hunian</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-800 text-xs">
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
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {r.type || 'Standar'}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {formatRupiah(r.price)}
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
                          size="sm"
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
                            onClick={() => handleOpenEditRoom(r)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Kamar"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteRoomTarget(r)}
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
          )}
        </div>
      )}

      {/* Tab 2: Info & Facilities */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Fasilitas Terpasang
            </h3>
            <div className="flex flex-wrap gap-2">
              {property.facilities && property.facilities.length > 0 ? (
                property.facilities.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check</span>
                    <span>{f.name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Belum ada data fasilitas yang ditambahkan.</span>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Aturan & Ketertiban
            </h3>
            <ul className="space-y-2">
              {property.rules && property.rules.length > 0 ? (
                property.rules.map((r) => (
                  <li key={r.id} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">
                      info
                    </span>
                    <span>{r.description}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400">Tidak ada aturan khusus terdaftar.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Room */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoomId ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
        description={`Properti: ${property.name}`}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
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
                  setIsRoomModalOpen(false);
                  openQuotaModal('room');
                }}
                className="px-3 py-1 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shrink-0 cursor-pointer"
              >
                Upgrade
              </button>
            </div>
          )}

          {roomError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {roomError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor Kamar *
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="contoh: 101, A-01"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
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
                placeholder="contoh: Lantai 1 Depan"
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
                placeholder="contoh: Standar, Deluxe, VIP"
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
                placeholder="contoh: 1200000"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
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
              Catatan / Deskripsi Kamar
            </label>
            <textarea
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              rows={2}
              placeholder="Fasilitas khusus kamar ini: AC Daikin, kasur springbed 120x200..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingRoom || (!editingRoomId && isRoomBlocked)}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingRoom && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>{editingRoomId ? 'Perbarui Kamar' : 'Simpan Kamar'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Room */}
      <ConfirmDialog
        isOpen={!!deleteRoomTarget}
        onClose={() => setDeleteRoomTarget(null)}
        onConfirm={handleDeleteRoom}
        title="Hapus Kamar?"
        message={`Apakah Anda yakin ingin menghapus Kamar ${deleteRoomTarget?.roomNumber}? Data riwayat sewa di kamar ini akan ikut terhapus.`}
        confirmText="Hapus Kamar"
        isDangerous
        isLoading={isDeletingRoom}
      />
    </div>
  );
};
