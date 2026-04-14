import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [showWallet, setShowWallet]   = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote]     = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersAPI.getAll({ page, limit: 20, search }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: customersAPI.create,
    onSuccess: () => {
      toast.success('Customer created!');
      qc.invalidateQueries(['customers']);
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
    },
    onError: e => toast.error(e.message),
  });

  const walletMutation = useMutation({
    mutationFn: ({ id, amount, note }) => customersAPI.topUpWallet(id, { amount, note }),
    onSuccess: (res) => {
      toast.success(`Wallet updated! New balance: $${res.data.walletBalance?.toFixed(2)}`);
      qc.invalidateQueries(['customers']);
      setShowWallet(null);
      setTopUpAmount('');
      setTopUpNote('');
    },
    onError: e => toast.error(e.message),
  });

  const columns = [
    { key: 'customerId',     label: 'ID',     render: v   => <span className="font-mono text-xs text-brand-400">{v}</span> },
    { key: 'firstName',      label: 'Name',   render: (_,r) => <span className="text-white font-medium">{r.firstName} {r.lastName}</span> },
    { key: 'phone',          label: 'Phone',  render: v   => <span className="text-gray-400 text-xs">{v || '—'}</span> },
    { key: 'totalPurchases', label: 'Orders', render: v   => <span className="text-white">{v}</span> },
    { key: 'totalSpent',     label: 'Spent',  render: v   => <span className="text-emerald-400 font-semibold">${v?.toFixed(2)}</span> },
    { key: 'walletBalance',  label: 'Wallet', render: v   => (
      <span className={`font-semibold tabular-nums ${(v||0) > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
        ${(v||0).toFixed(2)}
      </span>
    )},
    { key: 'loyaltyPoints',  label: 'Points', render: v   => <span className="badge-info">{v} pts</span> },
    { key: '_id',            label: '',       render: (_,r) => (
      <div className="flex gap-2 items-center">
        <button
          onClick={e => { e.stopPropagation(); setShowWallet(r); }}
          className="text-brand-400 hover:text-brand-300 text-xs font-medium whitespace-nowrap"
        >💳 Wallet</button>
        <button onClick={() => navigate(`/customers/${r._id}`)} className="text-gray-400 hover:text-white text-xs">View →</button>
      </div>
    )},
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
            {row.firstName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{row.firstName} {row.lastName}</p>
            <p className="text-gray-500 text-xs font-mono">{row.customerId}</p>
          </div>
        </div>
        <span className="badge-info ml-2 shrink-0">{row.loyaltyPoints} pts</span>
      </div>
      <div className="flex items-center justify-between mt-2 ml-10">
        <div className="flex gap-3 text-xs flex-wrap">
          <span className="text-gray-400">{row.totalPurchases} orders</span>
          <span className="text-emerald-400">${row.totalSpent?.toFixed(2)}</span>
          <span className={`font-medium ${(row.walletBalance||0) > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
            💳 ${(row.walletBalance||0).toFixed(2)}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowWallet(row)} className="text-brand-400 hover:text-brand-300 text-xs">+ Wallet</button>
          <button onClick={() => navigate(`/customers/${row._id}`)} className="text-gray-400 hover:text-white text-xs">View →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search customers..." className="flex-1" />
        <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">+ Add</button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      {/* Create customer */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">First Name *</label><input className="input" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><label className="label">Last Name *</label><input className="input" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Wallet top-up */}
      <Modal isOpen={!!showWallet} onClose={() => { setShowWallet(null); setTopUpAmount(''); setTopUpNote(''); }} title="Customer Wallet" size="sm">
        {showWallet && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-lg shrink-0">
                {showWallet.firstName?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{showWallet.firstName} {showWallet.lastName}</p>
                <p className="text-gray-500 text-xs">{showWallet.customerId}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand-400">${(showWallet.walletBalance || 0).toFixed(2)}</p>
                <p className="text-gray-500 text-xs">current balance</p>
              </div>
            </div>

            <div>
              <label className="label">Amount to Add ($)</label>
              <input
                type="number"
                className="input text-lg"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
                inputMode="decimal"
                autoFocus
              />
              {topUpAmount && parseFloat(topUpAmount) > 0 && (
                <p className="text-emerald-400 text-xs mt-1 font-medium">
                  New balance: ${((showWallet.walletBalance || 0) + parseFloat(topUpAmount)).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="label">Note (optional)</label>
              <input className="input" placeholder="Cash top-up, gift card redemption..." value={topUpNote} onChange={e => setTopUpNote(e.target.value)} />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => { setShowWallet(null); setTopUpAmount(''); setTopUpNote(''); }} className="btn-secondary">Cancel</button>
              <button
                onClick={() => walletMutation.mutate({ id: showWallet._id, amount: parseFloat(topUpAmount), note: topUpNote })}
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || walletMutation.isPending}
                className="btn-primary"
              >
                {walletMutation.isPending ? 'Processing...' : `Add $${parseFloat(topUpAmount || 0).toFixed(2)} to Wallet`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
