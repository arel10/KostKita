import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useOutletContext } from 'react-router-dom';
import api from '../../lib/api';
import { LoadingSpinner } from '../../components/ui/Feedback';

interface LeafletWindow extends Window {
  L?: any;
}
declare const window: LeafletWindow;

const COMMON_FACILITIES = [
  'WiFi Cepat',
  'AC Tiap Kamar',
  'Kamar Mandi Dalam',
  'Parkir Motor Luas',
  'Parkir Mobil Aman',
  'Dapur Bersama',
  'CCTV 24 Jam',
  'Mesin Cuci',
  'Dispenser Air Minum',
  'Akses Gerbang 24 Jam',
];

export const PropertyFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const context = useOutletContext<{ refreshGlobal: () => void }>();

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
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
  const [latitude, setLatitude] = useState<number>(-6.2088);
  const [longitude, setLongitude] = useState<number>(106.8456);

  // Facilities & Rules
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [rules, setRules] = useState<string>('');
  
  // Photo URLs
  const [photoUrls, setPhotoUrls] = useState<string[]>(['']);

  useEffect(() => {
    if (isEdit) {
      api.get(`/properties/${id}`)
        .then((res) => {
          const p = res.data.data;
          setName(p.name || '');
          setDescription(p.description || '');
          setType(p.type || 'campur');
          setWhatsapp(p.whatsapp || '');
          setPriceStart(p.priceStart || '');
          setAddress(p.address || '');
          setProvince(p.province || '');
          setCity(p.city || '');
          setDistrict(p.district || '');
          setSubdistrict(p.subdistrict || '');
          setPostalCode(p.postalCode || '');
          if (p.latitude && p.longitude) {
            setLatitude(p.latitude);
            setLongitude(p.longitude);
          }
          if (p.facilities?.length) {
            setSelectedFacilities(p.facilities.map((f: any) => f.name));
          }
          if (p.rules?.length) {
            setRules(p.rules.map((r: any) => r.description).join('\n'));
          }
          if (p.photos?.length) {
            setPhotoUrls(p.photos.map((ph: any) => ph.url));
          }
        })
        .catch((err) => {
          setError(err.response?.data?.error?.message || 'Gagal memuat properti');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, isEdit]);

  // Leaflet Interactive Map effect
  useEffect(() => {
    let mapInstance: any = null;
    let markerInstance: any = null;

    const timer = setTimeout(() => {
      const container = document.getElementById('property-map');
      if (container && window.L) {
        mapInstance = window.L.map('property-map').setView([latitude, longitude], 14);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapInstance);

        markerInstance = window.L.marker([latitude, longitude], { draggable: true }).addTo(mapInstance);

        markerInstance.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          setLatitude(parseFloat(latlng.lat.toFixed(6)));
          setLongitude(parseFloat(latlng.lng.toFixed(6)));
        });

        mapInstance.on('click', (e: any) => {
          markerInstance.setLatLng(e.latlng);
          setLatitude(parseFloat(e.latlng.lat.toFixed(6)));
          setLongitude(parseFloat(e.latlng.lng.toFixed(6)));
        });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [isLoading]);

  const toggleFacility = (facilityName: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facilityName) ? prev.filter((f) => f !== facilityName) : [...prev, facilityName]
    );
  };

  const handlePhotoUrlChange = (index: number, val: string) => {
    const updated = [...photoUrls];
    updated[index] = val;
    setPhotoUrls(updated);
  };

  const addPhotoInput = () => {
    setPhotoUrls([...photoUrls, '']);
  };

  const removePhotoInput = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (publishNow = false) => {
    if (!name || !address || !whatsapp) {
      setError('Mohon lengkapi Nama Kost, Alamat, dan Nomor WhatsApp kontak.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name,
      description,
      type,
      whatsapp,
      address,
      province,
      city,
      district,
      subdistrict,
      postalCode,
      latitude: Number(latitude),
      longitude: Number(longitude),
      priceStart: priceStart ? Number(priceStart) : undefined,
      facilities: selectedFacilities,
      rules: rules
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
    };

    try {
      let savedId = id;
      if (isEdit) {
        await api.patch(`/properties/${id}`, payload);
      } else {
        const res = await api.post('/properties', payload);
        savedId = res.data.data.id;
      }

      if (publishNow && savedId) {
        await api.post(`/properties/${savedId}/publish`);
      }

      context?.refreshGlobal?.();
      navigate('/properties');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Gagal menyimpan properti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Menyiapkan formulir properti..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 mb-1 text-xs text-slate-500">
            <Link to="/properties" className="hover:text-primary">Properti</Link>
            <span>/</span>
            <span className="text-primary font-bold">
              {isEdit ? 'Ubah Properti' : 'Pendaftaran Properti Baru'}
            </span>
          </nav>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEdit ? `Edit: ${name}` : 'Daftarkan Properti Kost Baru'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lengkapi profil bangunan untuk kemudahan publikasi dan pencarian penyewa.
          </p>
        </div>

        <Link
          to="/properties"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Section 1: Informasi Dasar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="material-symbols-outlined text-primary text-[22px]">info</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Informasi Dasar Kost
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Properti Kost *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Kost Melati Residence Padang"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tipe Penghuni Kost *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 font-semibold"
              >
                <option value="campur">Kost Campur (Pria & Wanita)</option>
                <option value="putra">Kost Khusus Putra</option>
                <option value="putri">Kost Khusus Putri</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nomor WhatsApp Pengelola / Owner *
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="contoh: 6281267891234"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Format internasional dengan kode 62 (tanpa tanda +).
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Harga Mulai Per Bulan (Rp)
              </label>
              <input
                type="number"
                value={priceStart}
                onChange={(e) => setPriceStart(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="contoh: 1250000"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deskripsi Lengkap Kost
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Jelaskan keunggulan lokasi, jarak ke kampus/kantor terdekat, suasana lingkungan..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Lokasi & Peta Koordinat Interaktif */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="material-symbols-outlined text-primary text-[22px]">location_on</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Alamat & Titik Peta Google Maps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Alamat Jalan & Nomor Bangunan *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="contoh: Jl. Belimbing Raya No. 14, Korong Gadang"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Provinsi
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="contoh: Sumatera Barat"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kota / Kabupaten
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="contoh: Kota Padang"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kecamatan
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="contoh: Kuranji"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kelurahan
              </label>
              <input
                type="text"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                placeholder="contoh: Korong Gadang"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kode Pos
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="contoh: 25156"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Leaflet Map Picker */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Tentukan Titik Koordinat Peta (Geser / Klik Marker):
              </span>
              <div className="text-[11px] text-slate-500 font-mono">
                Lat: {latitude}, Lng: {longitude}
              </div>
            </div>

            <div
              id="property-map"
              className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-10"
            ></div>
            <p className="text-[11px] text-slate-400 mt-1">
              💡 Titik koordinat ini digunakan untuk pencarian lokasi terdekat dan kalkulasi radius bagi calon penyewa.
            </p>
          </div>
        </div>

        {/* Section 3: Fasilitas & Aturan Kost */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="material-symbols-outlined text-primary text-[22px]">checklist</span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              3. Fasilitas & Aturan Kost
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Fasilitas Umum & Unggulan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {COMMON_FACILITIES.map((facility) => {
                const isSelected = selectedFacilities.includes(facility);
                return (
                  <button
                    key={facility}
                    type="button"
                    onClick={() => toggleFacility(facility)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      isSelected
                        ? 'bg-primary-fixed/40 border-primary text-primary font-bold'
                        : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isSelected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>{facility}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Aturan Kost (Satu baris per aturan)
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              placeholder="Contoh:&#10;Dilarang merokok di dalam kamar&#10;Tamu lawan jenis dilarang menginap&#10;Gerbang dikunci pukul 23:00 WIB"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/properties"
            className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Batal
          </Link>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-5 py-3 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Simpan sebagai Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-container shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">send</span>
            )}
            <span>Simpan & Tayangkan Publik</span>
          </button>
        </div>
      </div>
    </div>
  );
};
