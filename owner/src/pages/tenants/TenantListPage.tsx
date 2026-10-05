import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../lib/api';
import { Tenant, Property, Room } from '../../types';

export const TenantListPage: React.FC = () => {
  const { subscription, usage, isTenantBlocked, openQuotaModal, refreshSubscription } = useSubscription();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');

  // Modal: Add / Edit Tenant
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
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

  // Dialog: Delete Tenant
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const [tenantsRes, propsRes, roomsRes] = await Promise.allSettled([
        api.get('/tenants'),
        api.get('/properties'),
        api.get('/rooms', { params: { perPage: 100 } }),
      ]);

      if (tenantsRes.status === 'fulfilled' && tenantsRes.value.data?.data) {
        setTenants(tenantsRes.value.data.data);
      }
      if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
        setProperties(propsRes.value.data.data);
      }
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data?.data) {
        setRooms(roomsRes.value.data.data);
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

  const availableRooms = rooms.filter((r) => r.status === 'available');

  // Rooms available for modal selection (available rooms + currently assigned room if editing)
  const modalRooms = rooms.filter((r) => {
    const matchesProp = !selectedPropertyId || r.propertyId === selectedPropertyId;
    const isCurrent = editingTenant?.stays?.some((s) => s.status === 'active' && s.roomId === r.id);
    return matchesProp && (r.status === 'available' || isCurrent);
  });

  const formatLocalYMD = (val: string | Date | undefined) => {
    if (!val) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOpenAddModal = () => {
    if (isTenantBlocked) {
      openQuotaModal('tenant');
      return;
    }
    setEditingTenant(null);
    const initialPropId = properties[0]?.id || '';
    const initialRooms = rooms.filter((r) => r.propertyId === initialPropId && r.status === 'available');
    const initialRoom = initialRooms[0] || availableRooms[0];

    setName('');
    setPhone('');
    setIdCardNumber('');
    setEmergencyPhone('');
    setSelectedPropertyId(initialPropId);
    setSelectedRoomId(initialRoom?.id || '');
    setStartDate(formatLocalYMD(new Date()));
    setRentAmount(initialRoom ? initialRoom.price : 1000000);
    setDeposit(0);
    setNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (t: Tenant) => {
    const activeStay = t.stays?.find((s) => s.status === 'active') || t.stays?.[0];
    const currentRoom = activeStay?.room;
    const currentPropId = currentRoom?.propertyId || (currentRoom as any)?.property?.id || properties[0]?.id || '';

    setEditingTenant(t);
    setName(t.name || '');
    setPhone(t.phone || (t as any).whatsapp || '');
    setIdCardNumber((t as any).idCardNumber || '');
    setEmergencyPhone((t as any).emergencyPhone || '');
    setSelectedPropertyId(currentPropId);
    setSelectedRoomId(currentRoom?.id || '');

    const checkIn = activeStay?.startDate || (activeStay as any)?.checkInDate;
    setStartDate(formatLocalYMD(checkIn));

    setRentAmount(Number(activeStay?.rentAmount || (activeStay as any)?.rentPrice || currentRoom?.price || 1000000));
    setDeposit(activeStay?.deposit !== undefined && activeStay?.deposit !== null ? Number(activeStay.deposit) : 0);
    setNotes(t.notes || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handlePropertyChange = (propId: string) => {
    setSelectedPropertyId(propId);
    const roomsForProp = rooms.filter((r) => {
      const isCurrent = editingTenant?.stays?.some((s) => s.status === 'active' && s.roomId === r.id);
      return r.propertyId === propId && (r.status === 'available' || isCurrent);
    });

    if (roomsForProp.length > 0) {
      setSelectedRoomId(roomsForProp[0].id);
      setRentAmount(roomsForProp[0].price);
    } else {
      setSelectedRoomId('');
      setRentAmount('');
    }
  };

  const handleRoomSelectChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = rooms.find((room) => room.id === roomId);
    if (r) {
      setRentAmount(r.price);
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !selectedRoomId || !startDate || rentAmount === '') {
      setFormError('Mohon isi nama lengkap, nomor WhatsApp, pilih kamar, tanggal masuk, dan tarif sewa.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      idCardNumber: idCardNumber.trim(),
      emergencyPhone: emergencyPhone.trim(),
      notes: notes.trim(),
      roomId: selectedRoomId,
      startDate,
      rentAmount: Number(rentAmount),
      deposit: deposit !== '' ? Number(deposit) : 0,
    };

    try {
      if (!editingTenant && selectedRoomId && isTenantBlocked) {
        setFormError(`Batas kuota penghuni aktif tercapai pada paket ${subscription?.plan?.name || 'Trial'}. Silakan upgrade paket.`);
        openQuotaModal('tenant');
        return;
      }

      if (editingTenant) {
        await api.patch(`/tenants/${editingTenant.id}`, payload);
      } else {
        await api.post('/tenants', payload);
      }

      setIsAddModalOpen(false);
      setEditingTenant(null);
      fetchTenants();
      refreshSubscription();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Gagal menyimpan data penyewa.');
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
      refreshSubscription();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menyelesaikan masa sewa.');
    } finally {
      setIsEndingStay(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tenants/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTenants();
      refreshSubscription();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus data penyewa.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredTenants = tenants.filter((t) => {
    const q = (searchQuery || '').toLowerCase();
    const nameStr = (t.name || '').toLowerCase();
    const phoneStr = (t.phone || (t as any).whatsapp || '').toLowerCase();
    const idCardStr = ((t as any).idCardNumber || '').toLowerCase();
    const emergencyStr = ((t as any).emergencyPhone || '').toLowerCase();

    const matchesSearch =
      !q ||
      nameStr.includes(q) ||
      phoneStr.includes(q) ||
      idCardStr.includes(q) ||
      emergencyStr.includes(q) ||
      t.stays?.some(
        (s) =>
          (s.room?.roomNumber || '').toLowerCase().includes(q) ||
          (s.room?.property?.name || '').toLowerCase().includes(q)
      );

    const matchesProperty =
      !propertyFilter ||
      t.stays?.some((s) => s.room?.propertyId === propertyFilter || (s.room as any)?.property?.id === propertyFilter);

    return matchesSearch && matchesProperty;
  });

  const activeTenantsCount = tenants.filter((t) =>
    t.stays?.some((s) => s.status === 'active')
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Penyewa & Riwayat Sewa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data pribadi penyewa, alokasi unit kamar kost, NIK KTP, kontak darurat, dan status masa sewa.
          </p>
          {usage && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold ${isTenantBlocked ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                <span className="material-symbols-outlined text-[14px]">{isTenantBlocked ? 'lock' : 'verified'}</span>
                <span>Batas Penghuni Paket {subscription?.plan?.name || 'Trial'}: {usage.tenants.current} / {usage.tenants.limit ?? '∞'} Orang</span>
              </span>
              {isTenantBlocked && (
                <button
                  type="button"
                  onClick={() => openQuotaModal('tenant')}
                  className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
                >
                  Upgrade Paket →
                </button>
              )}
            </div>
          )}
        </div>

        {isTenantBlocked ? (
          <button
            type="button"
            onClick={() => openQuotaModal('tenant')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer"
            title="Batas kuota penyewa aktif tercapai untuk paket Anda. Klik untuk upgrade paket."
          >
            <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
            <span>+ Tambah Penyewa (Batas {usage?.tenants.current}/{usage?.tenants.limit})</span>
          </button>
        ) : (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Tambah Penyewa Baru</span>
          </button>
        )}
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
          <span className="text-[11px] text-emerald-600 font-bold uppercase block">Kamar Kosong</span>
          <span className="text-2xl font-extrabold text-emerald-800 mt-0.5 block">{availableRooms.length}</span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Siap disewakan</span>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <span className="text-[11px] text-blue-600 font-bold uppercase block">Properti Kost</span>
          <span className="text-2xl font-extrabold text-blue-800 mt-0.5 block">{properties.length}</span>
          <span className="text-[11px] text-blue-600 mt-1 block">Unit kost aktif</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full md:w-96">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, nomor WhatsApp, KTP, nomor kamar..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none w-full md:w-auto cursor-pointer"
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

      {/* Tenants Table */}
      {isLoading ? (
        <LoadingSpinner label="Memuat data penghuni kost..." />
      ) : filteredTenants.length === 0 ? (
        <EmptyState
          icon="group"
          title="Tidak Ada Penyewa Ditemukan"
          description={
            searchQuery
              ? `Tidak ada data penyewa yang cocok dengan kata kunci "${searchQuery}".`
              : propertyFilter
              ? 'Tidak ada penyewa pada properti kost ini.'
              : 'Belum ada penghuni yang terdaftar di sistem kost Anda.'
          }
          actionText={!searchQuery && !propertyFilter ? '+ Tambah Penyewa Sekarang' : undefined}
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
                  const displayPhone = t.phone || (t as any).whatsapp || '';
                  const idCard = (t as any).idCardNumber;
                  const emergency = (t as any).emergencyPhone;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary-fixed/50 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                            {(t.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">
                              {t.name || 'Tanpa Nama'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-500">{displayPhone || '-'}</span>
                              {displayPhone && (
                                <a
                                  href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                                  title="Chat WhatsApp"
                                >
                                  <span className="material-symbols-outlined text-[15px]">chat</span>
                                </a>
                              )}
                            </div>
                            {(idCard || emergency) && (
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                                {idCard && <span>NIK: <strong className="text-slate-600">{idCard}</strong></span>}
                                {emergency && <span>Darurat: <strong className="text-slate-600">{emergency}</strong></span>}
                              </div>
                            )}
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
                              {room.property?.name || 'Properti'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Belum dialokasikan</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {activeStay ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 block text-xs">
                              Masuk: {formatDateSafe(activeStay.startDate || (activeStay as any).checkInDate)}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {(activeStay.endDate || (activeStay as any).checkOutDate)
                                ? `Keluar: ${formatDateSafe(activeStay.endDate || (activeStay as any).checkOutDate)}`
                                : 'Sewa berjalan aktif'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {formatRupiah(Number(activeStay?.rentAmount || (activeStay as any)?.rentPrice || 0))}
                          <span className="text-[10px] text-slate-400 font-normal"> /bln</span>
                        </span>
                        {activeStay?.deposit ? (
                          <span className="text-[11px] text-emerald-700">
                            Deposit: {formatRupiah(Number(activeStay.deposit))}
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit data & kamar penyewa"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>Edit</span>
                          </button>

                          {activeStay?.status === 'active' && (
                            <button
                              onClick={() =>
                                setEndStayTarget({
                                  tenantId: t.id,
                                  stayId: activeStay.id,
                                  tenantName: t.name,
                                })
                              }
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Checkout / Selesai Sewa"
                            >
                              <span className="material-symbols-outlined text-[14px]">logout</span>
                              <span>Akhiri</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteTarget(t)}
                            className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Hapus data penyewa"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            <span>Hapus</span>
                          </button>
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

      {/* Modal Add / Edit Tenant */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTenant(null);
        }}
        title={editingTenant ? 'Edit Data Penyewa' : 'Tambah Penyewa Baru'}
        description={
          editingTenant
            ? `Perbarui data penghuni dan kamar untuk "${editingTenant.name}". Semua data akan tersimpan.`
            : 'Masukkan identitas penghuni dan alokasikan unit kamar kost.'
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSaveTenant} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          {!editingTenant && isTenantBlocked && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <span className="material-symbols-rounded text-sm">lock</span>
                <span>Batas Kuota Penghuni Aktif Tercapai</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Paket Anda ({subscription?.plan?.name || 'Trial'}) telah mencapai kuota maksimal {usage?.tenants?.limit} penghuni aktif. Upgrade paket untuk mengalokasikan kamar ke penghuni baru.
              </p>
              <button
                type="button"
                onClick={() => openQuotaModal('tenant')}
                className="self-start px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all"
              >
                Upgrade Paket
              </button>
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
                placeholder="16 digit NIK KTP"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kontak Darurat / Orang Tua (Opsional)
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

          {/* Room Allocation */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
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
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800 cursor-pointer"
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
                  Pilih Kamar *
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomSelectChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">-- Pilih Kamar --</option>
                  {modalRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Kamar {r.roomNumber} - {formatRupiah(r.price)} ({r.type || 'Standar'})
                      {r.status === 'occupied' ? ' [Kamar Saat Ini]' : ''}
                    </option>
                  ))}
                </select>
                {modalRooms.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Tidak ada kamar kosong di properti ini.
                  </p>
                )}
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 cursor-pointer"
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
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan perjanjian khusus, pekerjaan, no kendaraan, dll..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingTenant(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!editingTenant && isTenantBlocked)}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>{editingTenant ? 'Simpan Perubahan' : 'Daftarkan Penghuni'}</span>
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 cursor-pointer"
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
              placeholder="Status kondisi kunci, perabotan kamar, pengembalian uang deposit..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEndStayTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isEndingStay}
              onClick={handleConfirmEndStay}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isEndingStay && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Konfirmasi Selesai Sewa</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Tenant Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Penyewa"
        message={`Apakah Anda yakin ingin menghapus data penyewa "${deleteTarget?.name}"? Jika penyewa sedang aktif, kamarnya akan otomatis kembali berstatus Kosong (Available).`}
        confirmText={isDeleting ? 'Menghapus...' : 'Hapus'}
        isDangerous
        isLoading={isDeleting}
        onConfirm={handleDeleteTenant}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
