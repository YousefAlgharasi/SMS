import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', paymentTerms: 'Net 30' });

  const { data, isLoading } = useQuery({ queryKey: ['suppliers', page, search], queryFn: () => suppliersAPI.getAll({ page, limit: 20, search }), keepPreviousData: true });
  const createMutation = useMutation({ mutationFn: suppliersAPI.create, onSuccess: () => { toast.success('Supplier created!'); qc.invalidateQueries(['suppliers']); setShowModal(false); setForm({ name: '', contactPerson: '', email: '', phone: '', paymentTerms: 'Net 30' }); }, onError: e => toast.error(e.message) });

  const columns = [
    { key: 'supplierId', label: 'ID', render: v => <span className="font-mono text-xs text-brand-400">{v}</span> },
    { key: 'name', label: 'Supplier', render: v => <span className="text-white font-medium">{v}</span> },
    { key: 'contactPerson', label: 'Contact', render: v => <span className="text-gray-400 text-sm">{v || '—'}</span> },
    { key: 'email', label: 'Email', render: v => <span className="text-gray-400 text-xs">{v || '—'}</span> },
    { key: 'phone', label: 'Phone', render: v => <span className="text-gray-400 text-xs">{v || '—'}</span> },
    { key: 'paymentTerms', label: 'Terms', render: v => <span className="badge-info">{v}</span> },
    { key: 'isActive', label: 'Status', render: v => <span className={v ? 'badge-success' : 'badge-danger'}>{v ? 'Active' : 'Inactive'}</span> }
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-white font-medium text-sm">{row.name}</p>
          <p className="text-gray-500 text-xs font-mono">{row.supplierId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-info text-xs">{row.paymentTerms}</span>
          <span className={row.isActive ? 'badge-success' : 'badge-danger'}>{row.isActive ? 'Active' : 'Off'}</span>
        </div>
      </div>
      <div className="flex gap-4 mt-1 text-xs text-gray-500">
        {row.contactPerson && <span>{row.contactPerson}</span>}
        {row.phone && <span>{row.phone}</span>}
        {row.email && <span className="truncate">{row.email}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search suppliers..." className="flex-1" />
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">+ Add</button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Supplier">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div><label className="label">Company Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" /></div>
          </div>
          <div><label className="label">Payment Terms</label><input className="input" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
