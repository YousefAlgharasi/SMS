import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';

const moduleBadge = {
  auth: 'badge-info', sales: 'badge-success', inventory: 'badge-warning', customers: 'badge-info',
  products: 'badge-info', suppliers: 'badge-info', purchase_orders: 'badge-warning',
  returns: 'badge-danger', users: 'badge-danger', reports: 'badge-info'
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, module, startDate, endDate],
    queryFn: () => auditAPI.getLogs({ page, limit: 50, module, startDate, endDate })
  });

  const columns = [
    { key: 'userName', label: 'User', render: (v, r) => (
      <div>
        <p className="text-white text-sm">{v || '—'}</p>
        <p className="text-gray-500 text-xs capitalize">{r.user?.role}</p>
      </div>
    )},
    { key: 'action', label: 'Action', render: v => <span className="font-mono text-xs text-amber-400">{v}</span> },
    { key: 'module', label: 'Module', render: v => <span className={moduleBadge[v] || 'badge-info'}>{v}</span> },
    { key: 'status', label: 'Status', render: v => <span className={v === 'success' ? 'badge-success' : 'badge-danger'}>{v}</span> },
    { key: 'ipAddress', label: 'IP', render: v => <span className="font-mono text-gray-600 text-xs">{v}</span> },
    { key: 'createdAt', label: 'Time', render: v => <span className="text-gray-500 text-xs">{new Date(v).toLocaleString()}</span> }
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-amber-400 text-xs">{row.action}</span>
        <span className={row.status === 'success' ? 'badge-success' : 'badge-danger'}>{row.status}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm">{row.userName || '—'}</p>
          <span className={moduleBadge[row.module] || 'badge-info'}>{row.module}</span>
        </div>
        <p className="text-gray-500 text-xs text-right">{new Date(row.createdAt).toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <select className="input w-full sm:w-40" value={module} onChange={e => { setModule(e.target.value); setPage(1); }}>
          <option value="">All Modules</option>
          {['auth','sales','inventory','customers','products','suppliers','purchase_orders','returns','users','reports'].map(m => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
        <div className="flex gap-2 flex-1">
          <input type="date" className="input flex-1 sm:w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="input flex-1 sm:w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} emptyMessage="No audit logs found" mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>
    </div>
  );
}
