import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { PageHeader, Spinner } from '../../components/ui/Feedback';

interface SystemHealthData {
  status: 'operational' | 'degraded';
  timestamp: string;
  database: {
    status: string;
    latencyMs: number;
    provider: string;
    counts: {
      users: number;
      properties: number;
      rooms: number;
      tenants: number;
      subscriptions: number;
      payments: number;
      auditLogs: number;
    };
  };
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    osRelease: string;
    cpuCount: number;
    cpuModel: string;
    processId: number;
    environment: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    systemTotal: number;
    systemFree: number;
  };
  storage: {
    cloudinaryConfigured: boolean;
    cloudinaryCloudName: string | null;
    cloudinaryObjectsCount?: number | null;
    cloudinaryStorageMb?: number | null;
    cloudinaryPlan?: string | null;
    cloudinaryCreditsUsed?: number | null;
    dbMediaCount?: number;
    localUploadsCount: number;
    localUploadsSizeMb: number;
  };
  services: {
    googleAuth: boolean;
    rateLimiter: boolean;
    jwtAuth: boolean;
    redis?: boolean;
    redisLatencyMs?: number;
    redisVersion?: string | null;
    redisMemory?: string | null;
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}h`);
  if (h > 0 || d > 0) parts.push(`${h}j`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}d`);
  return parts.join(' ');
}

export const SystemHealthPage: React.FC = () => {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<SystemHealthData>({
    queryKey: ['system-health'],
    queryFn: async () => (await api.get('/admin/system-health')).data.data,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  if (isLoading) return <Spinner label="Menganalisis kesehatan sistem KostKita..." />;

  const isHealthy = data?.status === 'operational';
  const heapPercent = data ? Math.min(100, Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100)) : 0;
  const sysRamPercent = data ? Math.min(100, Math.round(((data.memory.systemTotal - data.memory.systemFree) / data.memory.systemTotal) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Kesehatan & Performa Sistem"
        subtitle="Monitoring real-time infrastruktur backend, koneksi database PostgreSQL, beban memori, dan layanan platform."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              Auto-refresh (5s): {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[16px] ${isFetching ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isFetching ? 'Memeriksa...' : 'Cek Sekarang'}</span>
            </button>
          </div>
        }
      />

      {/* Main Status Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${isHealthy
        ? 'bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border-emerald-200/90 shadow-2xs'
        : 'bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-white border-rose-200 shadow-2xs'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${isHealthy ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
              <span className="material-symbols-outlined text-[26px]">
                {isHealthy ? 'check_circle' : 'warning'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {isHealthy ? 'Seluruh Sistem Beroperasi Normal' : 'Peringatan: Performa Terdegradasi'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${isHealthy ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800'
                  }`}>
                  {data?.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemeriksaan terakhir: {new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB • Host Node.js berjalan lancar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-xs px-4 py-2 rounded-xl border border-slate-200/70">
            <div className="text-center border-r border-slate-200 pr-4">
              <span className="text-[10px] block text-slate-400 uppercase font-bold">Uptime Server</span>
              <span className="text-slate-900 font-extrabold">{data ? formatUptime(data.system.uptimeSeconds) : '-'}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] block text-slate-400 uppercase font-bold">DB Latency</span>
              <span className={`font-extrabold ${data && data.database.latencyMs < 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {data?.database.latencyMs} ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Database Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database PostgreSQL</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">database</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {data?.database.status === 'healthy' ? 'Terhubung' : 'Terputus'}
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {data?.database.latencyMs} ms
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Prisma ORM Client v5 Engine
          </p>
        </div>

        {/* Card 2: Memory Load */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Node.js Heap Memory</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">memory</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {data?.memory.heapUsed} MB
            </span>
            <span className="text-xs text-slate-400">
              / {data?.memory.heapTotal} MB
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${heapPercent > 80 ? 'bg-rose-500' : heapPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${heapPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            RSS Process: <span className="font-semibold text-slate-700">{data?.memory.rss} MB</span> ({heapPercent}% Heap)
          </p>
        </div>

        {/* Card 3: Storage & Files */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penyimpanan Media</span>
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-slate-900">
              {data?.storage.cloudinaryConfigured ? 'Cloudinary' : 'Lokal Disk'}
            </span>
            {data?.storage.cloudinaryConfigured && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                CDN AKTIF
              </span>
            )}
          </div>
          {data?.storage.cloudinaryConfigured ? (
            <div className="mt-2 space-y-1">
              <p className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Aset Cloudinary:</span>
                <span className="font-bold text-slate-700">
                  {data?.storage.cloudinaryObjectsCount ?? 0} file ({data?.storage.cloudinaryStorageMb ?? 0} MB)
                </span>
              </p>
              <p className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Foto di database:</span>
                <span className="font-semibold text-slate-600">{data?.storage.dbMediaCount ?? 0} terindeks</span>
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>Berkas tersimpan:</span>
              <span className="font-bold text-slate-700">{data?.storage.localUploadsCount} file ({data?.storage.localUploadsSizeMb} MB)</span>
            </p>
          )}
        </div>

        {/* Card 4: Runtime Specs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Environment & Node</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {data?.system.nodeVersion}
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
              {data?.system.environment}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            PID: {data?.system.processId} • {data?.system.platform}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Database Metrics & Services Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Database Records Count (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">Volume Entitas Database Terpusat</h4>
              <p className="text-xs text-slate-400 mt-0.5">Jumlah record terindeks dalam database PostgreSQL KostKita</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              PostgreSQL DB
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pengguna Terdaftar</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.users.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Pemilik & Admin</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Properti Kost</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.properties.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Listing kost terdaftar</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Kamar</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.rooms.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Unit kamar sewa</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Data Penyewa</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.tenants.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Anak kost tercatat</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pembayaran Langganan</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.payments.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Bukti transfer & QRIS</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Log Audit Keamanan</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data?.database.counts.auditLogs.toLocaleString('id-ID')}</span>
              <span className="text-[10px] text-slate-400">Jejak aktivitas admin</span>
            </div>
          </div>

          {/* System Host RAM info */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <span>RAM Mesin Host: <strong className="text-slate-800 font-semibold">{data?.memory.systemFree} MB bebas</strong> dari total {data?.memory.systemTotal} MB</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Penggunaan RAM Host: <strong>{sysRamPercent}%</strong>
            </span>
          </div>
        </div>

        {/* Right Column: Platform Services Checklist */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <div className="pb-4 border-b border-slate-100 mb-5">
            <h4 className="font-extrabold text-slate-900 text-sm">Status Modul & Layanan</h4>
            <p className="text-xs text-slate-400 mt-0.5">Integrasi pihak ketiga & keamanan</p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified_user</span>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Autentikasi JWT</span>
                  <span className="text-[10px] text-slate-400">Bearer Token + Security Guard</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                AKTIF
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-sky-600 text-[20px]">shield</span>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Rate Limiting</span>
                  <span className="text-[10px] text-slate-400">Anti-DDoS / Brute Force</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                AKTIF
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">key</span>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Google OAuth 2.0</span>
                  <span className="text-[10px] text-slate-400">One-Tap & SSO Login</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data?.services.googleAuth ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                {data?.services.googleAuth ? 'TERHUBUNG' : 'TIDAK AKTIF'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-violet-600 text-[20px]">cloud_upload</span>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cloudinary Media CDN</span>
                  <span className="text-[10px] text-slate-400">
                    {data?.storage.cloudinaryCloudName
                      ? `Cloud: ${data.storage.cloudinaryCloudName}${data?.storage.cloudinaryObjectsCount !== undefined ? ` • ${data.storage.cloudinaryObjectsCount} aset (${data.storage.cloudinaryStorageMb ?? 0} MB)` : ''}`
                      : 'Penyimpanan lokal disk aktif'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data?.storage.cloudinaryConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                {data?.storage.cloudinaryConfigured ? 'CLOUD' : 'LOCAL'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-rose-600 text-[20px]">database</span>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Redis In-Memory Engine</span>
                  <span className="text-[10px] text-slate-400">
                    {data?.services.redis
                      ? `v${data.services.redisVersion || '7'} • Latency: ${data.services.redisLatencyMs ?? 0}ms • RAM: ${data.services.redisMemory || 'OK'}`
                      : 'Layanan Redis tidak aktif'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${data?.services.redis ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {data?.services.redis ? 'TERHUBUNG' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100/70 text-[11px] text-indigo-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-indigo-600 shrink-0 mt-0.5">info</span>
            <span>
              Semua query database melalui koneksi terenkripsi. Uptime server direset otomatis saat ada deployment atau pembaruan kode.
            </span>
          </div>
        </div>
      </div>

      {/* Hardware & CPU Specs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <h4 className="font-extrabold text-slate-900 text-sm mb-4">Informasi Mesin & Lingkungan Server</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400 font-medium">Sistem Operasi</span>
            <span className="font-bold text-slate-800">{data?.system.platform}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400 font-medium">CPU Core</span>
            <span className="font-bold text-slate-800">{data?.system.cpuCount} Core vCPU</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400 font-medium">Model Prosesor</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]" title={data?.system.cpuModel}>{data?.system.cpuModel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPage;
