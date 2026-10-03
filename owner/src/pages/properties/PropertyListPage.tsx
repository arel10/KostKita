import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner, EmptyState } from '../../components/ui/Feedback';
import { PropertyFormModal } from '../../components/properties/PropertyFormModal';
import { useSubscription } from '../../context/SubscriptionContext';
import api from '../../lib/api';
import { Property } from '../../types';

interface PropertyListPageProps {
  initialOpenModal?: boolean;
}

export const PropertyListPage: React.FC<PropertyListPageProps> = ({ initialOpenModal = false }) => {
  const context = useOutletContext<{ refreshGlobal: () => void }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeEditId } = useParams<{ id: string }>();

  const { subscription, usage, isPropertyBlocked, openQuotaModal, refreshSubscription } = useSubscription();

  const isNewRoute = initialOpenModal || location.pathname.endsWith('/new');
  const [isModalOpen, setIsModalOpen] = useState((isNewRoute && !isPropertyBlocked) || Boolean(routeEditId));
  const [modalPropertyId, setModalPropertyId] = useState<string | null>(routeEditId || null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialOpenModal || location.pathname.endsWith('/new')) {
      if (isPropertyBlocked) {
        setIsModalOpen(false);
        openQuotaModal('property');
        navigate('/properties', { replace: true });
      } else {
        setIsModalOpen(true);
        setModalPropertyId(null);
      }
    } else if (routeEditId) {
      setIsModalOpen(true);
      setModalPropertyId(routeEditId);
    }
  }, [initialOpenModal, location.pathname, routeEditId, isPropertyBlocked]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/properties');
      if (res.data?.data) {
        setProperties(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch properties:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleTogglePublish = async (property: Property) => {
    try {
      if (property.status === 'active') {
        await api.post(`/properties/${property.id}/unpublish`);
      } else {
        await api.post(`/properties/${property.id}/publish`);
      }
      fetchProperties();
      context?.refreshGlobal?.();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal mengubah status publikasi.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/properties/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchProperties();
      context?.refreshGlobal?.();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal menghapus properti.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalPropertyId(null);
    if (location.pathname.endsWith('/new') || routeEditId) {
      navigate('/properties', { replace: true });
    }
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchProperties();
    context?.refreshGlobal?.();
    refreshSubscription();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Add Button */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 mb-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-primary">Juragan Portal</Link>
            <span>/</span>
            <span className="text-primary font-bold">Properti</span>
          </nav>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Multi-Unit Management</span>
            </div>

            {/* Quota Usage Badge */}
            {usage && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                isPropertyBlocked
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {isPropertyBlocked ? 'lock' : 'verified'}
                </span>
                <span>
                  Batas Paket {subscription?.plan?.name || 'Trial'}: {usage.properties.current} / {usage.properties.limit ?? '∞'} Properti
                </span>
                {isPropertyBlocked && (
                  <button
                    type="button"
                    onClick={() => openQuotaModal('property')}
                    className="ml-1 underline text-amber-800 hover:text-amber-950 font-extrabold cursor-pointer"
                  >
                    Upgrade Paket
                  </button>
                )}
              </div>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daftar Properti Kost
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Kelola portofolio bangunan kost, status tayang di pencarian publik, dan pantau tingkat hunian real-time.
          </p>
        </div>

        {/* Add Property Button: Blocked if limit is reached */}
        {isPropertyBlocked ? (
          <button
            type="button"
            onClick={() => openQuotaModal('property')}
            className="inline-flex items-center gap-2 px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-300 hover:border-amber-400 text-xs font-bold rounded-xl shadow-xs transition-all self-start lg:self-auto cursor-pointer group"
            title="Batas kuota properti tercapai untuk paket Anda. Klik untuk upgrade ke paket Pro."
          >
            <span className="material-symbols-outlined text-[20px] text-amber-700 group-hover:scale-110 transition-transform">lock</span>
            <span>+ Tambah Properti (Kuota Penuh {usage?.properties.current}/{usage?.properties.limit})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setModalPropertyId(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-md transition-all self-start lg:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_business</span>
            <span>+ Tambah Properti Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl gap-2 w-full sm:w-80">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama properti, kota, alamat..."
            className="bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Status Listing:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif (Tayang Publik)</option>
            <option value="draft">Draft</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Property Cards Grid */}
      {isLoading ? (
        <LoadingSpinner label="Memuat portofolio properti kost Anda..." />
      ) : filteredProperties.length === 0 ? (
        <EmptyState
          icon="apartment"
          title="Tidak Ada Properti Ditemukan"
          description={
            searchQuery
              ? `Tidak ada properti yang cocok dengan kata kunci "${searchQuery}".`
              : 'Anda belum mendaftarkan properti kost. Mulai tambahkan kost Anda sekarang!'
          }
          actionText={
            searchQuery
              ? undefined
              : isPropertyBlocked
              ? 'Batas Kuota Properti Penuh (Upgrade)'
              : 'Tambah Properti Sekarang'
          }
          onAction={
            searchQuery
              ? undefined
              : isPropertyBlocked
              ? () => openQuotaModal('property')
              : () => {
                  setModalPropertyId(null);
                  setIsModalOpen(true);
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((p) => {
            const primaryPhoto =
              p.photos?.find((ph) => ph.isPrimary)?.url ||
              p.photos?.[0]?.url ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';
            const totalRooms = p.rooms?.length || p._count?.rooms || 0;
            const occupiedRooms = p.rooms?.filter((r) => r.status === 'occupied').length || 0;
            const availableRooms = p.rooms?.filter((r) => r.status === 'available').length || 0;

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Thumbnail with Badges */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={primaryPhoto}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge
                        variant={p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'neutral'}
                        size="sm"
                        dot
                      >
                        {p.status === 'active' ? 'Tayang di Discovery' : p.status === 'draft' ? 'Draft' : 'Nonaktif'}
                      </Badge>
                      <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-full capitalize">
                        Kost {p.type}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-primary text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm">
                      Mulai {formatRupiah(p.priceStart || 0)}/bln
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <Link
                      to={`/properties/${p.id}`}
                      className="text-base font-extrabold text-slate-900 hover:text-primary transition-colors block line-clamp-1"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                      <span className="truncate">{p.address}, {p.city || p.province}</span>
                    </p>

                    {/* Room Stats Bento */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                        <span className="text-xs font-bold text-slate-800">{totalRooms} Kamar</span>
                      </div>
                      <div className="bg-emerald-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-600 uppercase font-bold block">Terisi</span>
                        <span className="text-xs font-bold text-emerald-800">{occupiedRooms} Kamar</span>
                      </div>
                      <div className="bg-blue-50/70 p-2 rounded-xl">
                        <span className="text-[10px] text-blue-600 uppercase font-bold block">Kosong</span>
                        <span className="text-xs font-bold text-blue-800">{availableRooms} Kamar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-2 border-t border-slate-50">
                  <button
                    onClick={() => handleTogglePublish(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                      p.status === 'active'
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title={p.status === 'active' ? 'Tarik dari pencarian publik' : 'Tayangkan di pencarian publik'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {p.status === 'active' ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{p.status === 'active' ? 'Arsipkan' : 'Tayangkan'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setModalPropertyId(p.id);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit Properti"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <Link
                      to={`/properties/${p.id}`}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Kelola Kamar</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Hapus Properti"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Form Modal (New & Edit) */}
      <PropertyFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        propertyId={modalPropertyId}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Properti Kost?"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Seluruh data kamar dan riwayat sewa di properti ini akan ikut terhapus.`}
        confirmText="Hapus Permanen"
        isDangerous
        isLoading={isDeleting}
      />
    </div>
  );
};
