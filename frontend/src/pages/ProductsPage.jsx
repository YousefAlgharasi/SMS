import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI, suppliersAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', category: '', unitPrice: '', costPrice: '', stock: 0, reorderLevel: 10, taxRate: 0, discount: 0, barcode: '', sku: '', supplier: '' };

export default function ProductsPage() {
  const { canManageInventory, user } = useAuth();
  const canDelete = ['admin', 'supervisor'].includes(user?.role);
  const qc = useQueryClient();

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate]       = useState(false);
  const [showEdit, setShowEdit]           = useState(null);  // product object
  const [showAdjust, setShowAdjust]       = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [adjustQty, setAdjustQty]   = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm]     = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, category],
    queryFn: () => productsAPI.getAll({ page, limit: 20, search, category }),
    keepPreviousData: true,
  });
  const { data: catData }  = useQuery({ queryKey: ['categories'], queryFn: productsAPI.getCategories });
  const { data: suppData } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersAPI.getAll({ limit: 100 }) });
  const categories = catData?.data || [];
  const suppliers  = suppData?.data || [];

  const createMutation = useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      toast.success('Product created!');
      qc.invalidateQueries(['products']); qc.invalidateQueries(['categories']);
      setShowCreate(false); setCreateForm(EMPTY_FORM);
    },
    onError: e => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Product updated!');
      qc.invalidateQueries(['products']); qc.invalidateQueries(['categories']);
      setShowEdit(null);
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsAPI.delete(id),
    onSuccess: () => {
      toast.success('Product deactivated');
      qc.invalidateQueries(['products']); qc.invalidateQueries(['categories']);
      setShowDeleteConfirm(null);
    },
    onError: e => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => productsAPI.adjustStock(id, data),
    onSuccess: () => {
      toast.success('Stock adjusted!');
      qc.invalidateQueries(['products']);
      setShowAdjust(null); setAdjustQty(''); setAdjustNote('');
    },
    onError: e => toast.error(e.message),
  });

  const openEdit = (product) => {
    setEditForm({
      name: product.name,
      category: product.category,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice || '',
      reorderLevel: product.reorderLevel,
      taxRate: product.taxRate || 0,
      discount: product.discount || 0,
      barcode: product.barcode || '',
      sku: product.sku || '',
      supplier: product.supplier?._id || product.supplier || '',
    });
    setShowEdit(product);
  };

  const columns = [
    { key: 'productId', label: 'ID', render: v => <span className="font-mono text-xs text-brand-400">{v}</span> },
    { key: 'name', label: 'Product', render: (v, r) => (
      <div>
        <p className="text-white font-medium text-sm">{v}</p>
        <p className="text-gray-500 text-xs">{r.category}</p>
      </div>
    )},
    { key: 'unitPrice', label: 'Price', render: v => <span className="text-white font-semibold">${v?.toFixed(2)}</span> },
    { key: 'stock', label: 'Stock', render: (v, r) => (
      <span className={v === 0 ? 'badge-danger' : v <= r.reorderLevel ? 'badge-warning' : 'badge-success'}>{v} units</span>
    )},
    { key: 'reorderLevel', label: 'Reorder', render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'taxRate',      label: 'Tax',     render: v => <span className="text-gray-400 text-xs">{v}%</span> },
    { key: '_id', label: 'Actions', render: (_, r) => canManageInventory() && (
      <div className="flex gap-2">
        <button onClick={() => setShowAdjust(r)}  className="text-brand-400 hover:text-brand-300 text-xs">Stock</button>
        <button onClick={() => openEdit(r)}        className="text-emerald-400 hover:text-emerald-300 text-xs">Edit</button>
        {canDelete && (
          <button onClick={() => setShowDeleteConfirm(r)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
        )}
      </div>
    )},
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-sm">{row.name}</p>
          <p className="text-gray-500 text-xs">{row.category} · <span className="font-mono text-brand-400">{row.productId}</span></p>
        </div>
        <span className={`ml-3 shrink-0 ${row.stock === 0 ? 'badge-danger' : row.stock <= row.reorderLevel ? 'badge-warning' : 'badge-success'}`}>
          {row.stock} units
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-white font-bold">${row.unitPrice?.toFixed(2)}</span>
        {canManageInventory() && (
          <div className="flex gap-3 text-xs">
            <button onClick={() => setShowAdjust(row)} className="text-brand-400 hover:text-brand-300">Stock</button>
            <button onClick={() => openEdit(row)}      className="text-emerald-400 hover:text-emerald-300">Edit</button>
            {canDelete && (
              <button onClick={() => setShowDeleteConfirm(row)} className="text-red-400 hover:text-red-300">Delete</button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const ProductForm = ({ form, setForm, onSubmit, loading, submitLabel }) => (
    <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Product Name *</label>
          <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Category *</label>
          <input className="input" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} list="cats" />
          <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="label">Supplier</label>
          <select className="input" value={form.supplier || ''} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}>
            <option value="">None</option>
            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Selling Price *</label>
          <input type="number" className="input" required min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} inputMode="decimal" />
        </div>
        <div>
          <label className="label">Cost Price</label>
          <input type="number" className="input" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} inputMode="decimal" />
        </div>
        {form.stock !== undefined && !showEdit && (
          <div>
            <label className="label">Initial Stock</label>
            <input type="number" className="input" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} inputMode="numeric" />
          </div>
        )}
        <div>
          <label className="label">Reorder Level</label>
          <input type="number" className="input" min="0" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} inputMode="numeric" />
        </div>
        <div>
          <label className="label">Tax Rate (%)</label>
          <input type="number" className="input" min="0" max="100" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} inputMode="decimal" />
        </div>
        <div>
          <label className="label">Discount (%)</label>
          <input type="number" className="input" min="0" max="100" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} inputMode="decimal" />
        </div>
        <div>
          <label className="label">Barcode</label>
          <input className="input" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
        </div>
        <div>
          <label className="label">SKU</label>
          <input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={() => { setShowCreate(false); setShowEdit(null); }} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search products..." className="flex-1 min-w-40" />
        <select className="input w-full sm:w-40" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {canManageInventory() && (
          <button onClick={() => setShowCreate(true)} className="btn-primary w-full sm:w-auto justify-center">+ Add Product</button>
        )}
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }} title="New Product" size="lg">
        <ProductForm
          form={createForm} setForm={setCreateForm}
          onSubmit={() => createMutation.mutate({
            ...createForm,
            unitPrice: Number(createForm.unitPrice), costPrice: Number(createForm.costPrice),
            stock: Number(createForm.stock), reorderLevel: Number(createForm.reorderLevel),
            taxRate: Number(createForm.taxRate), discount: Number(createForm.discount),
          })}
          loading={createMutation.isPending} submitLabel="Create Product"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit — ${showEdit?.name}`} size="lg">
        <ProductForm
          form={editForm} setForm={setEditForm}
          onSubmit={() => updateMutation.mutate({
            id: showEdit._id,
            data: {
              ...editForm,
              unitPrice: Number(editForm.unitPrice), costPrice: Number(editForm.costPrice),
              reorderLevel: Number(editForm.reorderLevel), taxRate: Number(editForm.taxRate),
              discount: Number(editForm.discount),
            },
          })}
          loading={updateMutation.isPending} submitLabel="Save Changes"
        />
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={!!showAdjust} onClose={() => { setShowAdjust(null); setAdjustQty(''); setAdjustNote(''); }} title={`Adjust Stock — ${showAdjust?.name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-surface-2 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-gray-400">Current Stock</span>
            <span className="text-white font-bold">{showAdjust?.stock} units</span>
          </div>
          <div>
            <label className="label">Quantity Change</label>
            <input type="number" className="input" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="+10 to add, -5 to remove" inputMode="numeric" />
            {adjustQty && (
              <p className="text-xs mt-1 text-gray-400">
                New stock: <span className="text-white font-medium">{Math.max(0, (showAdjust?.stock || 0) + Number(adjustQty))}</span>
              </p>
            )}
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Stock count, damage..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAdjust(null); setAdjustQty(''); setAdjustNote(''); }} className="btn-secondary">Cancel</button>
            <button
              onClick={() => adjustMutation.mutate({ id: showAdjust._id, data: { quantity: Number(adjustQty), notes: adjustNote } })}
              disabled={!adjustQty || adjustMutation.isPending}
              className="btn-primary"
            >{adjustMutation.isPending ? 'Saving...' : 'Adjust'}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Deactivate Product" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 font-medium text-sm mb-1">⚠ This will hide the product</p>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">"{showDeleteConfirm?.name}"</strong> will be deactivated and won't appear in sales or searches.
              Existing sales records are kept.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate(showDeleteConfirm._id)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >{deleteMutation.isPending ? 'Deleting...' : 'Deactivate'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
