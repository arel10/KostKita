import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../../lib/api';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/Feedback';
import { useSubscription } from '../../context/SubscriptionContext';

// Fix leaflet default marker icons in bundlers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string | null;
  onSuccess?: (savedPropertyId: string) => void;
}

const COMMON_FACILITIES = [
  { name: 'WiFi Cepat', icon: 'wifi' },
  { name: 'AC Tiap Kamar', icon: 'ac_unit' },
  { name: 'Kamar Mandi Dalam', icon: 'shower' },
  { name: 'Kasur & Ranjang', icon: 'bed' },
  { name: 'Lemari Pakaian', icon: 'door_sliding' },
  { name: 'Meja & Kursi Belajar', icon: 'desk' },
  { name: 'Parkir Motor Luas', icon: 'two_wheeler' },
  { name: 'Parkir Mobil Aman', icon: 'directions_car' },
  { name: 'Dapur Bersama', icon: 'countertops' },
  { name: 'CCTV 24 Jam', icon: 'videocam' },
  { name: 'Mesin Cuci', icon: 'local_laundry_service' },
  { name: 'Dispenser Air Minum', icon: 'water_drop' },
  { name: 'Akses Gerbang 24 Jam', icon: 'lock_open' },
  { name: 'Listrik Sudah Termasuk', icon: 'bolt' },
];

const PRESET_LOCATIONS = [
  { name: 'Padang', lat: -0.9471, lng: 100.4172, province: 'Sumatera Barat', city: 'Kota Padang' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, province: 'DKI Jakarta', city: 'Jakarta Selatan' },
  { name: 'Bandung', lat: -6.9175, lng: 107.6191, province: 'Jawa Barat', city: 'Kota Bandung' },
  { name: 'Yogyakarta', lat: -7.7956, lng: 110.3695, province: 'DI Yogyakarta', city: 'Kota Yogyakarta' },
  { name: 'Surabaya', lat: -7.2575, lng: 112.7521, province: 'Jawa Timur', city: 'Kota Surabaya' },
];

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  onSuccess,
}) => {
  const isEdit = Boolean(propertyId);
  const { subscription, usage, isPropertyBlocked, openQuotaModal } = useSubscription();
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'facilities' | 'photos'>('info');

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states: Info Dasar
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'active' | 'inactive' | 'suspended'>('draft');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'putra' | 'putri' | 'campur'>('campur');
  const [whatsapp, setWhatsapp] = useState('');
  const [priceStart, setPriceStart] = useState<number | ''>('');

  // Location
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number>(-0.9471);
  const [longitude, setLongitude] = useState<number>(100.4172);

  // Facilities & Rules
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [customFacility, setCustomFacility] = useState('');
  const [rules, setRules] = useState<string>('');

  // Device Photo Uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; url: string; isPrimary: boolean }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Clean up object URLs when unmounting or changing files
  const cleanupPreviews = (urls: string[]) => {
    urls.forEach((u) => {
      if (u.startsWith('blob:')) {
        URL.revokeObjectURL(u);
      }
    });
  };

  // Reset or load initial data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setActiveTab('info');
    cleanupPreviews(previewUrls);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingPhotos([]);

    if (isEdit && propertyId) {
      setIsLoadingData(true);
      api.get(`/properties/${propertyId}`)
        .then((res) => {
          const p = res.data.data;
          setCurrentStatus(p.status || 'draft');
          setName(p.name || '');
          setDescription(p.description || '');
          setType(p.type || 'campur');
          setWhatsapp(p.whatsapp || '');
          setPriceStart(p.priceStart !== undefined && p.priceStart !== null ? Number(p.priceStart) : '');
          setAddress(p.address || '');
          setProvince(p.province || '');
          setCity(p.city || '');
          setDistrict(p.district || '');
          setSubdistrict(p.subdistrict || '');
          setPostalCode(p.postalCode || '');
          if (p.latitude && p.longitude) {
            setLatitude(Number(p.latitude));
            setLongitude(Number(p.longitude));
          }
          if (p.facilities?.length) {
            setSelectedFacilities(p.facilities.map((f: any) => f.facilityName || f.name));
          } else {
            setSelectedFacilities([]);
          }
          if (p.rules?.length) {
            setRules(p.rules.map((r: any) => r.rule || r.description).join('\n'));
          } else {
            setRules('');
          }
          if (p.photos?.length) {
            setExistingPhotos(
              p.photos.map((ph: any) => ({
                id: ph.id,
                url: ph.url,
                isPrimary: Boolean(ph.isPrimary),
              }))
            );
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error?.message || 'Gagal memuat detail properti.');
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else {
      // Reset form for fresh create
      setName('');
      setDescription('');
      setType('campur');
      setWhatsapp('');
      setPriceStart('');
      setAddress('');
      setProvince('Sumatera Barat');
      setCity('Kota Padang');
      setDistrict('');
      setSubdistrict('');
      setPostalCode('');
      setLatitude(-0.9471);
      setLongitude(100.4172);
      setSelectedFacilities(['WiFi Cepat', 'Kamar Mandi Dalam']);
      setRules('Tamu lawan jenis dilarang masuk kamar\nMenjaga kebersihan dan ketertiban bersama\nDilarang merokok di dalam kamar');
      setExistingPhotos([]);
      setSelectedFiles([]);
      setPreviewUrls([]);
    }
  }, [isOpen, propertyId, isEdit]);

  // Leaflet map setup & resize invalidation
  useEffect(() => {
    if (!isOpen || activeTab !== 'location') return;

    const timer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      if (!mapInstanceRef.current) {
        const map = L.map(container).setView([latitude, longitude], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);

        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          setLatitude(parseFloat(latlng.lat.toFixed(6)));
          setLongitude(parseFloat(latlng.lng.toFixed(6)));
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          setLatitude(parseFloat(e.latlng.lat.toFixed(6)));
          setLongitude(parseFloat(e.latlng.lng.toFixed(6)));
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([latitude, longitude], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, activeTab]);

  // Clean up map when modal unmounts/closes
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  const handleApplyPresetLocation = (loc: typeof PRESET_LOCATIONS[0]) => {
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    setProvince(loc.province);
    setCity(loc.city);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 14);
      markerRef.current.setLatLng([loc.lat, loc.lng]);
    }
  };

  const toggleFacility = (facilityName: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facilityName) ? prev.filter((f) => f !== facilityName) : [...prev, facilityName]
    );
  };

  const handleAddCustomFacility = () => {
    if (!customFacility.trim()) return;
    if (!selectedFacilities.includes(customFacility.trim())) {
      setSelectedFacilities([...selectedFacilities, customFacility.trim()]);
    }
    setCustomFacility('');
  };

  // Device File Upload Handlers
  const handleDeviceFiles = (fileList: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(fileList);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    const totalAllowed = MAX_PHOTOS - (existingPhotos.length + selectedFiles.length);

    if (totalAllowed <= 0) {
      setError(`Maksimal ${MAX_PHOTOS} foto diperbolehkan per properti.`);
      return;
    }

    const filesToProcess = incoming.slice(0, totalAllowed);

    for (const f of filesToProcess) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError(`File "${f.name}" bukan format gambar yang didukung (gunakan JPG, PNG, atau WEBP).`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`Ukuran file "${f.name}" melebihi batas 5MB.`);
        continue;
      }
      validFiles.push(f);
      validPreviews.push(URL.createObjectURL(f));
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setPreviewUrls((prev) => [...prev, ...validPreviews]);
    }

    if (incoming.length > totalAllowed) {
      setError(`Hanya ${totalAllowed} foto yang dapat ditambahkan karena batas maksimal 10 foto.`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDeviceFiles(e.target.files);
    }
    // reset input so the same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDeviceFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    const urlToRemove = previewUrls[index];
    if (urlToRemove) URL.revokeObjectURL(urlToRemove);

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    const file = selectedFiles[index];
    const preview = previewUrls[index];

    const newFiles = [file, ...selectedFiles.filter((_, i) => i !== index)];
    const newPreviews = [preview, ...previewUrls.filter((_, i) => i !== index)];

    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const handleDeleteExistingPhoto = async (photoId: string) => {
    if (!propertyId) return;
    try {
      await api.delete(`/properties/${propertyId}/photos/${photoId}`);
      setExistingPhotos((prev) => prev.filter((ph) => ph.id !== photoId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal menghapus foto tersimpan.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Submit handler
  const handleSubmit = async (publishNow = false) => {
    if (!isEdit && isPropertyBlocked) {
      setError(`Batas kuota properti tercapai pada paket ${subscription?.plan?.name || 'Trial'}. Silakan upgrade paket langganan Anda.`);
      openQuotaModal('property');
      return;
    }

    // Basic validation
    if (!name.trim()) {
      setError('Nama Properti Kost wajib diisi (minimal 3 karakter).');
      setActiveTab('info');
      return;
    }
    if (name.trim().length < 3) {
      setError('Nama Properti Kost terlalu pendek (minimal 3 karakter).');
      setActiveTab('info');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError('Alamat lengkap wajib diisi (minimal 5 karakter).');
      setActiveTab('location');
      return;
    }

    // Sanitize WhatsApp number
    let cleanWa = whatsapp.replace(/[^0-9]/g, '');
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1);
    }
    if (!cleanWa || cleanWa.length < 9 || cleanWa.length > 15) {
      setError('Nomor WhatsApp tidak valid (harus 9-15 digit angka, contoh: 08123456789 atau 628123456789).');
      setActiveTab('info');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const parsedRules = rules
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      whatsapp: cleanWa,
      address: address.trim(),
      province: province.trim() || undefined,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      subdistrict: subdistrict.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      priceStart: priceStart !== '' ? Number(priceStart) : undefined,
      facilities: selectedFacilities,
      rules: parsedRules,
    };

    try {
      let savedId = propertyId;
      if (isEdit && propertyId) {
        await api.patch(`/properties/${propertyId}`, payload);
      } else {
        const res = await api.post('/properties', payload);
        savedId = res.data.data.id;
      }

      // Upload selected files from device
      if (selectedFiles.length > 0 && savedId) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('photos', file);
        });

        await api.post(`/properties/${savedId}/photos`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (publishNow && savedId && currentStatus !== 'active') {
        try {
          await api.post(`/properties/${savedId}/publish`);
        } catch (publishErr: any) {
          if (publishErr.response?.data?.error?.code !== 'ALREADY_ACTIVE') {
            throw publishErr;
          }
        }
      }

      cleanupPreviews(previewUrls);
      onSuccess?.(savedId || '');
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Gagal menyimpan properti. Mohon periksa kembali isian formulir.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPhotosCount = existingPhotos.length + selectedFiles.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        cleanupPreviews(previewUrls);
        onClose();
      }}
      title={isEdit ? `Edit Properti: ${name || 'Kost'}` : 'Pendaftaran Properti Kost Baru'}
      description="Lengkapi data bangunan, lokasi peta, dan upload foto kost dari perangkat Anda."
      maxWidth="4xl"
    >
      {isLoadingData ? (
        <div className="py-16">
          <LoadingSpinner label="Memuat informasi properti..." />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quota Exceeded Alert if adding new property */}
          {!isEdit && isPropertyBlocked && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-amber-600 shrink-0">lock</span>
                <div>
                  <span className="font-extrabold block">Batas Kuota Properti Tercapai</span>
                  <span className="text-amber-800 text-[11px]">
                    Paket <strong>{subscription?.plan?.name || 'Trial'}</strong> hanya mengizinkan maksimal {usage?.properties.limit} properti. Upgrade ke paket Pro untuk menambah properti tanpa batas.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openQuotaModal('property');
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shrink-0 cursor-pointer shadow-xs"
              >
                Upgrade Paket Sekarang
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-[20px] text-red-500 shrink-0">error</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">apartment</span>
              <span>1. Info Dasar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'location'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              <span>2. Lokasi & Peta</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('facilities')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'facilities'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">checklist</span>
              <span>3. Fasilitas & Aturan</span>
              {selectedFacilities.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full">
                  {selectedFacilities.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'photos'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>4. Upload Foto</span>
              {totalPhotosCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-bold">
                  {totalPhotosCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Info Dasar */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Properti Kost *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Kost Melati Residence Exclusive"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-medium"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gunakan nama bangunan yang jelas dan mudah dicari oleh calon penyewa.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipe Penghuni Kost *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'campur', label: 'Campur', icon: 'wc' },
                      { id: 'putra', label: 'Putra', icon: 'man' },
                      { id: 'putri', label: 'Putri', icon: 'woman' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id as any)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all gap-1 ${
                          type === t.id
                            ? 'bg-primary-fixed/40 border-primary text-primary shadow-xs'
                            : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp Pengelola *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">
                      call
                    </span>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="08123456789 atau 628123456789"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-mono"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Calon penyewa akan langsung menghubungi nomor WhatsApp ini saat bertanya atau booking.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Harga Mulai Per Bulan (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={priceStart}
                      onChange={(e) => setPriceStart(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 1250000"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ditampilkan sebagai patokan harga termurah ("Mulai dari Rp .../bulan") pada listing pencarian.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deskripsi Lengkap Bangunan & Lingkungan
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Ceritakan kelebihan kost Anda: akses transportasi, jarak ke kampus/kantor terdekat, kebersihan, keamanan 24 jam..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Lokasi & Peta */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Jalan & Nomor Bangunan *
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Belimbing Raya No. 14, Korong Gadang"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Provinsi
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Contoh: Sumatera Barat"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kota / Kabupaten
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Kota Padang"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kecamatan
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Contoh: Kuranji"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kelurahan
                  </label>
                  <input
                    type="text"
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    placeholder="Contoh: Korong Gadang"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Contoh: 25156"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Leaflet Map Interactive Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">pin_drop</span>
                      Titik Koordinat Peta (Geser atau Klik Peta untuk menentukan lokasi)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                      Koordinat: Lat {latitude}, Lng {longitude}
                    </span>
                  </div>

                  {/* Preset City Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Kota Cepat:</span>
                    {PRESET_LOCATIONS.map((loc) => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleApplyPresetLocation(loc)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-primary-fixed/40 hover:text-primary text-slate-600 border border-slate-200 transition-colors"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  ref={mapContainerRef}
                  className="w-full h-64 rounded-xl overflow-hidden border border-slate-300/80 shadow-inner z-10"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Fasilitas & Aturan */}
          {activeTab === 'facilities' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilih Fasilitas Bangunan & Kamar
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {COMMON_FACILITIES.map((f) => {
                    const isSelected = selectedFacilities.includes(f.name);
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => toggleFacility(f.name)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                          isSelected
                            ? 'bg-primary-fixed/40 border-primary text-primary font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isSelected ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Facility Input */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <input
                    type="text"
                    value={customFacility}
                    onChange={(e) => setCustomFacility(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomFacility())}
                    placeholder="Tambah fasilitas kustom lainnya (contoh: Ruang Fitness, Balkon Pribadi)..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFacility}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Aturan & Ketentuan Kost (Satu baris per aturan)
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={4}
                  placeholder="Contoh:&#10;Dilarang merokok di dalam kamar&#10;Tamu lawan jenis dilarang menginap&#10;Gerbang dikunci pukul 23:00 WIB"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Upload Foto dari Device */}
          {activeTab === 'photos' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Upload Foto dari Perangkat / Device
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Foto pertama otomatis dijadikan Cover Utama listing kost Anda (Maksimal 10 foto).
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                  {totalPhotosCount} / {MAX_PHOTOS} Foto
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/png, image/jpeg, image/webp"
                multiple
                className="hidden"
              />

              {/* Drag and Drop Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-slate-200 hover:border-primary/60 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">
                  Klik untuk Memilih Foto dari Perangkat Anda
                </h4>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  atau seret dan lepas file foto langsung ke area ini. Format didukung: JPG, PNG, WEBP (maks. 5MB per file).
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-3 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">add_photo_alternate</span>
                  <span>Jelajahi File Komputer</span>
                </button>
              </div>

              {/* Existing Photos (If in edit mode) */}
              {existingPhotos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Foto Tersimpan Saat Ini:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {existingPhotos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                      >
                        <img
                          src={photo.url}
                          alt={`Existing ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {photo.isPrimary && (
                          <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                            ⭐ Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingPhoto(photo.id)}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                          title="Hapus foto ini"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Selected Files Preview Gallery */}
              {previewUrls.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">
                      Foto yang Baru Dipilih ({previewUrls.length} file siap di-upload):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        cleanupPreviews(previewUrls);
                        setSelectedFiles([]);
                        setPreviewUrls([]);
                      }}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      Hapus Semua Pilihan
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {previewUrls.map((url, idx) => {
                      const file = selectedFiles[idx];
                      const isCover = existingPhotos.length === 0 && idx === 0;

                      return (
                        <div
                          key={idx}
                          className={`relative rounded-2xl overflow-hidden border transition-all flex flex-col justify-between bg-white shadow-xs group ${
                            isCover ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
                          }`}
                        >
                          {/* Image Box */}
                          <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                            <img
                              src={url}
                              alt={file?.name || `Preview ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isCover && (
                              <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                <span>Cover Utama</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedFile(idx)}
                              className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors"
                              title="Hapus foto ini"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>

                          {/* Info & Action Footer */}
                          <div className="p-2.5 bg-white space-y-1">
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="font-semibold text-slate-700 truncate" title={file?.name}>
                                {file?.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {file ? formatFileSize(file.size) : ''}
                              </span>
                            </div>

                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => handleMakeCover(idx)}
                                className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-primary-fixed/40 hover:text-primary text-slate-600 border border-slate-200 transition-colors flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                <span>Jadikan Cover</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {/* Step navigation helpers */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeTab !== 'info' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'photos') setActiveTab('facilities');
                    else if (activeTab === 'facilities') setActiveTab('location');
                    else if (activeTab === 'location') setActiveTab('info');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Sebelumnya</span>
                </button>
              )}

              {activeTab !== 'photos' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'info') setActiveTab('location');
                    else if (activeTab === 'location') setActiveTab('facilities');
                    else if (activeTab === 'facilities') setActiveTab('photos');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary-fixed/30 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>Selanjutnya</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              )}
            </div>

            {/* Submission Actions */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  cleanupPreviews(previewUrls);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSubmitting || (!isEdit && isPropertyBlocked)}
                onClick={() => handleSubmit(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Draft'}
              </button>

              <button
                type="button"
                disabled={isSubmitting || (!isEdit && isPropertyBlocked)}
                onClick={() => handleSubmit(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">
                    {currentStatus === 'active' ? 'save' : 'send'}
                  </span>
                )}
                <span>{currentStatus === 'active' ? 'Simpan Perubahan' : 'Simpan & Tayangkan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
