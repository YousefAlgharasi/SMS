import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { salesAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';

const statusBadge = { completed: 'badge-success', pending: 'badge-warning', refunded: 'badge-danger', partially_refunded: 'badge-warning' };
const pmLabel = { cash: '💵 Cash', card: '💳 Card', digital_wallet: '📱 Wallet' };

export default function SalesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, search, status, startDate, endDate],
    queryFn: () => salesAPI.getAll({ page, limit: 20, search, status, startDate, endDate }),
    keepPreviousData: true
  });

  const columns = [
    { key: 'receiptNumber', label: 'Receipt', render: v => <span className="font-mono text-brand-400 text-xs">{v}</span> },
    { key: 'customer', label: 'Customer', render: (v, row) => <span className="text-gray-300">{v ? `${v.firstName} ${v.lastName}` : row.customerSnapshot?.name || 'Walk-in'}</span> },
    { key: 'total', label: 'Amount', render: v => <span className="text-white font-semibold">${v?.toFixed(2)}</span> },
    { key: 'paymentMethod', label: 'Payment', render: v => <span className="text-gray-400 text-xs">{pmLabel[v] || v}</span> },
    { key: 'status', label: 'Status', render: v => <span className={statusBadge[v] || 'badge-info'}>{v}</span> },
    { key: 'processedBy', label: 'Staff', render: v => <span className="text-gray-400 text-xs">{v?.name}</span> },
    { key: 'createdAt', label: 'Date', render: v => <span className="text-gray-500 text-xs">{new Date(v).toLocaleString()}</span> },
    { key: '_id', label: '', render: (_, row) => <button onClick={() => navigate(`/sales/${row._id}`)} className="text-brand-400 hover:text-brand-300 text-xs">View →</button> }
  ];

  const mobileCard = (row) => (
    <div
      className="px-4 py-3 hover:bg-surface-2/40 cursor-pointer transition-colors active:bg-surface-2"
      onClick={() => navigate(`/sales/${row._id}`)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-brand-400 text-xs">{row.receiptNumber}</span>
        <span className={statusBadge[row.status] || 'badge-info'}>{row.status}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">
            {row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : row.customerSnapshot?.name || 'Walk-in'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {pmLabel[row.paymentMethod] || row.paymentMethod} · {new Date(row.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="text-white font-bold text-base">${row.total?.toFixed(2)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); setPage(1); }}
          placeholder="Search receipt, customer..."
          className="w-full sm:flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          <select className="input flex-1 sm:w-36" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partial Refund</option>
          </select>
          <input type="date" className="input flex-1 sm:w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="input flex-1 sm:w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button onClick={() => navigate('/sales/new')} className="btn-primary w-full sm:w-auto justify-center">
          + New Sale
        </button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} emptyMessage="No sales found" mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>
    </div>
  );
}
