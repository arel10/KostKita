import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import api from '../../lib/api';
import { Tenant, Property, Room } from '../../types';

export const TenantListPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  // Modal: Add Tenant
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rentAmount, setRentAmount] = useState<number | ''>('');
  const [deposit, setDeposit] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal: End Stay
  const [endStayTarget, setEndStayTarget] = useState<{ tenantId: string; stayId: string; tenantName: string } | null>(null);
  const [endStayDate, setEndStayDate] = useState(new Date().toISOString().split('T')[0]);
  const [endStayNotes, setEndStayNotes] = useState('');
  const [isEndingStay, setIsEndingStay] = useState(false);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const [tenantsRes, propsRes, roomsRes] = await Promise.allSettled([
        api.get('/tenants'),
        api.get('/properties'),
        api.get('/rooms?status=available'),
      ]);

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.data) {
        setTenants(tenantsRes.value.data.data);
      }
      if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
        setProperties(propsRes.value.data.data);
      }
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.data) {
        setAvailableRooms(roomsRes.value.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch tenants:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Update room list when selectedPropertyId changes in modal
  const modalRooms = availableRooms.filter(
    (r) => !selectedPropertyId || r.propertyId === selectedPropertyId
  );

  const handleOpenAddModal = () => {
    setName('');
    setPhone('');
    setIdCardNumber('');
    setEmergencyPhone('');
    setSelectedPropertyId(properties[0]?.id || '');
    setSelectedRoomId(availableRooms[0]?.id || '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setRentAmount(availableRooms[0]?.price || 1000000);
    setDeposit(0);
    setNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleRoomSelectChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = availableRooms.find((room) => room.id === roomId);
    if (r) {
      setRentAmount(r.price);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !selectedRoomId || !startDate || !rentAmount) {
      setFormError('Mohon isi nama, nomor WhatsApp, pilih kamar, tanggal masuk, dan harga sewa.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await api.post('/tenants', {
        name,
        phone,
        idCardNumber: idCardNumber || undefined,
        emergencyPhone: emergencyPhone || undefined,
        notes: notes || undefined,
        roomId: selectedRoomId,
        startDate,
        rentAmount: Number(rentAmount),
        deposit: deposit ? Number(deposit) : 0,
      });

      setIsAddModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal menambahkan penyewa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEndStay = async () => {
    if (!endStayTarget) return;
    setIsEndingStay(true);
    try {
      await api.patch(`/tenants/${endStayTarget.tenantId}/stays/${endStayTarget.stayId}/end`, {
        endDate: endStayDate,
        notes: endStayNotes || undefined,
      });
      setEndStayTarget(null);
      fetchTenants();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menyelesaikan masa sewa.');
    } finally {
      setIsEndingStay(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.stays?.some(
        (s) =>
          s.room?.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.room?.property?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesProperty =
      !propertyFilter ||
      t.stays?.some((s) => s.room?.propertyId === propertyFilter);
    return matchesSearch && matchesProperty;
  });

  const activeTenantsCount = tenants.filter((t) =>
    t.stays?.some((s) => s.status === 'active')
  ).length;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Penyewa & Riwayat Sewa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data pribadi penyewa, masa sewa, status pembayaran kamar, dan kontak WhatsApp.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>+ Tambah Penyewa Baru</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold uppercase block">Penyewa Aktif</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{activeTenantsCount}</span>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Sedang menghuni</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Database</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{tenants.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Termasuk riwayat lama</span>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[11px] text-emerald-600 font-bold uppercase block">Kamar Tersedia</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">{availableRooms.length}</span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Siap dialokasikan</span>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <span className="text-[11px] text-blue-600 font-bold uppercase block">Properti Kost</span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 block">{properties.length}</span>
          <span className="text-[11px] text-blue-600 mt-1 block">Unit kost aktif</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full md:w-80">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, WhatsApp, nomor kamar..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none w-full md:w-auto"
          >
            <option value="">Semua Properti Kost</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner label="Memuat data penghuni kost..." />
      ) : filteredTenants.length === 0 ? (
        <EmptyState
          icon="group"
          title="Tidak Ada Penyewa Ditemukan"
          description={
            searchQuery
              ? `Tidak ada data penyewa yang cocok dengan kata kunci "${searchQuery}".`
              : 'Belum ada penghuni yang terdaftar di sistem kost Anda.'
          }
          actionText="+ Tambah Penyewa Sekarang"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="px-6 py-4">Data Pribadi Penghuni</th>
                  <th className="px-6 py-4">Kamar & Properti</th>
                  <th className="px-6 py-4">Masa Sewa</th>
                  <th className="px-6 py-4">Tarif Sewa & Deposit</th>
                  <th className="px-6 py-4">Status Sewa</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => {
                  const activeStay = t.stays?.find((s) => s.status === 'active') || t.stays?.[0];
                  const room = activeStay?.room;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary-fixed/50 text-primary font-bold flex items-center justify-center text-sm">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {t.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500">{t.phone}</span>
                              <a
                                href={`https://wa.me/${t.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                                title="Chat WhatsApp"
                              >
                                <span className="material-symbols-outlined text-[16px]">chat</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {room ? (
                          <>
                            <span className="font-bold text-slate-800 block">
                              Kamar {room.roomNumber} ({room.type || 'Standar'})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {room.property?.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Belum dialokasikan</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {activeStay ? (
                          <>
                            <span className="font-semibold text-slate-700 block">
                              Masuk: {new Date(activeStay.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {activeStay.endDate
                                ? `Keluar: ${new Date(activeStay.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : 'Sewa berjalan'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {formatRupiah(activeStay?.rentAmount || 0)}
                          <span className="text-[10px] text-slate-400 font-normal"> /bln</span>
                        </span>
                        {activeStay?.deposit ? (
                          <span className="text-[11px] text-emerald-700">
                            Deposit: {formatRupiah(activeStay.deposit)}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={activeStay?.status === 'active' ? 'success' : 'neutral'}
                          size="md"
                          dot
                        >
                          {activeStay?.status === 'active' ? 'Aktif Menghuni' : 'Selesai Sewa'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeStay?.status === 'active' && (
                            <button
                              onClick={() =>
                                setEndStayTarget({
                                  tenantId: t.id,
                                  stayId: activeStay.id,
                                  tenantName: t.name,
                                })
                              }
                              className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Checkout / Akhiri masa tinggal"
                            >
                              Akhiri Sewa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add Tenant */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Pendaftaran Penyewa Baru"
        description="Masukkan identitas penghuni dan alokasikan kamar kost."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateTenant} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Lengkap Penyewa *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Muhammad Rizki"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor WhatsApp *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="contoh: 081234567890"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor KTP / NIK (Opsional)
              </label>
              <input
                type="text"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="16 digit NIK"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kontak Darurat / Orang Tua
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="contoh: 081987654321"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Allocation */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Alokasi Kamar & Kesepakatan Sewa
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Properti Kost *
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Kamar Kosong *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomSelectChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Kamar --</option>
                  {modalRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Kamar {r.roomNumber} - {formatRupiah(r.price)} ({r.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Masuk *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biaya Sewa / Bulan *
                </label>
                <input
                  type="number"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uang Jaminan (Deposit)
                </label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Tambahan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan khusus penghuni ini..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Daftarkan Penghuni</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal End Stay */}
      <Modal
        isOpen={!!endStayTarget}
        onClose={() => setEndStayTarget(null)}
        title="Akhiri Masa Sewa (Checkout)"
        description={`Penghuni: ${endStayTarget?.tenantName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Tanggal Keluar *
            </label>
            <input
              type="date"
              value={endStayDate}
              onChange={(e) => setEndStayDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Catatan Pengembalian Kamar & Jaminan
            </label>
            <textarea
              value={endStayNotes}
              onChange={(e) => setEndStayNotes(e.target.value)}
              rows={3}
              placeholder="Status kondisi kunci, kondisi perabotan, pengembalian deposit..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEndStayTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isEndingStay}
              onClick={handleConfirmEndStay}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isEndingStay && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Konfirmasi Selesai Sewa</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
