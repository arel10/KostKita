import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import api from '../../lib/api';
import type { OverviewReport } from '../../types';
import { PageHeader, Spinner, StatCard } from '../../components/ui/Feedback';
import { compactRupiah, rupiah } from '../../lib/format';

const colors = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e'];

export const ReportPage: React.FC = () => {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useQuery({
    queryKey: ['report-overview', months],
    queryFn: async () => (await api.get('/admin/reports/overview', { params: { months } })).data.data as OverviewReport,
    placeholderData: (p) => p,
  });

  return (
    <>
      <PageHeader title="Reports" subtitle="Analitik pendapatan dan pertumbuhan platform." actions={
        <select className="input !w-auto" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Periode">
          {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} bulan terakhir</option>)}
        </select>
      } />
      {isLoading || !data ? <Spinner /> : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={compactRupiah(data.totalRevenue)} hint={rupiah(data.totalRevenue)} icon="account_balance_wallet" />
            <StatCard delay={50} label="Owner Baru" value={data.newOwners} icon="person_add" tone="sky" />
            <StatCard delay={100} label="Owner Berbayar" value={data.conversion.payingOwners} icon="workspace_premium" tone="violet" hint={`dari ${data.conversion.totalOwners} owner`} />
            <StatCard delay={150} label="Konversi Trial → Paid" value={`${data.conversion.rate}%`} icon="trending_up" tone="amber" />
          </div>

          <div className="grid xl:grid-cols-3 gap-4 mt-6">
            <div className="card p-5 xl:col-span-2">
              <h2 className="font-extrabold text-ink-900 mb-4">Revenue per Bulan</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series} margin={{ left: -5, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} tickFormatter={compactRupiah} width={75} />
                    <Tooltip formatter={(v) => rupiah(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #dde4ee' }} cursor={{ fill: '#f6f8fb' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-extrabold text-ink-900 mb-4">Distribusi Paket Aktif</h2>
              {data.distribution.length === 0 ? <p className="text-sm text-ink-400 py-20 text-center">Belum ada data.</p> : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.distribution} dataKey="count" nameKey="plan" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {data.distribution.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dde4ee' }} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 mt-4">
            <h2 className="font-extrabold text-ink-900 mb-4">Pertumbuhan Owner</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ left: -25, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8593a8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dde4ee' }} />
                  <Line type="monotone" dataKey="owners" name="Owner baru" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
};
