import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const roleColors = { admin: 'badge-danger', supervisor: 'badge-info', inventory_manager: 'badge-success', cashier: 'badge-warning' };
const roleLabels = { admin: 'Admin', supervisor: 'Supervisor', inventory_manager: 'Inv. Manager', cashier: 'Cashier' };

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier', phone: '' });

  const { data, isLoading } = useQuery({ queryKey: ['users', page, search], queryFn: () => usersAPI.getAll({ page, limit: 20, search }) });
  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => { toast.success('User created!'); qc.invalidateQueries(['users']); setShowModal(false); setForm({ name: '', email: '', password: '', role: 'cashier', phone: '' }); },
    onError: e => toast.error(e.message)
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersAPI.update(id, { isActive }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries(['users']); },
    onError: e => toast.error(e.message)
  });

  const columns = [
    { key: 'name', label: 'Name', render: (v, r) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">{v?.[0]}</div>
        <span className="text-white text-sm">{v}</span>
      </div>
    )},
    { key: 'email', label: 'Email', render: v => <span className="text-gray-400 text-sm">{v}</span> },
    { key: 'role', label: 'Role', render: v => <span className={roleColors[v] || 'badge-info'}>{roleLabels[v] || v}</span> },
    { key: 'phone', label: 'Phone', render: v => <span className="text-gray-500 text-xs">{v || '—'}</span> },
    { key: 'lastLogin', label: 'Last Login', render: v => <span className="text-gray-500 text-xs">{v ? new Date(v).toLocaleDateString() : 'Never'}</span> },
    { key: 'isActive', label: 'Status', render: (v, r) => (
      <button onClick={() => toggleMutation.mutate({ id: r._id, isActive: !v })} className={`${v ? 'badge-success' : 'badge-danger'} cursor-pointer hover:opacity-75 transition-opacity`}>
        {v ? 'Active' : 'Inactive'}
      </button>
    )}
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-sm font-bold">{row.name?.[0]}</div>
          <div>
            <p className="text-white text-sm font-medium">{row.name}</p>
            <p className="text-gray-500 text-xs">{row.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={roleColors[row.role] || 'badge-info'}>{roleLabels[row.role] || row.role}</span>
          <button onClick={() => toggleMutation.mutate({ id: row._id, isActive: !row.isActive })} className={`${row.isActive ? 'badge-success' : 'badge-danger'} cursor-pointer hover:opacity-75`}>
            {row.isActive ? '✓' : '✗'}
          </button>
        </div>
      </div>
      <p className="text-gray-600 text-xs ml-10">
        Last login: {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never'}
        {row.phone && ` · ${row.phone}`}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search users..." className="flex-1" />
        <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">+ Add User</button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New User">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Email *</label><input type="email" className="input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">Password *</label><input type="password" className="input" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="cashier">Cashier</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
