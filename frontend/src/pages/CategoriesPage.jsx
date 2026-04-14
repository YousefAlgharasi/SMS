import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI } from '../services/api';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ['admin', 'supervisor', 'inventory_manager'].includes(user?.role);
  const canDelete = ['admin', 'supervisor'].includes(user?.role);

  const [selected,       setSelected]       = useState(null);
  const [renaming,       setRenaming]       = useState(null);
  const [newName,        setNewName]        = useState('');
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [showAddInfo,    setShowAddInfo]    = useState(false); // "how to add" modal

  const { data, isLoading } = useQuery({ queryKey: ['categories-detail'], queryFn: categoriesAPI.getAll });
  const { data: productsData } = useQuery({
    queryKey: ['category-products', selected],
    queryFn: () => categoriesAPI.getProducts(selected),
    enabled: !!selected,
  });

  const renameMutation = useMutation({
    mutationFn: ({ name, newName }) => categoriesAPI.rename(name, newName),
    onSuccess: (_, vars) => {
      toast.success('Category renamed!');
      qc.invalidateQueries(['categories-detail']);
      qc.invalidateQueries(['categories']);
      qc.invalidateQueries(['products']);
      if (selected === vars.name) setSelected(vars.newName.trim());
      setRenaming(null); setNewName('');
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (name) => categoriesAPI.delete(name),
    onSuccess: (_, name) => {
      toast.success('Category deleted — products deactivated');
      qc.invalidateQueries(['categories-detail']);
      qc.invalidateQueries(['products']);
      if (selected === name) setSelected(null);
      setConfirmDelete(null);
    },
    onError: e => toast.error(e.message),
  });

  const categories = data?.data || [];
  const products   = productsData?.data || [];
  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0);
  const totalValue    = categories.reduce((s, c) => s + c.totalValue, 0);

  return (
    <div className="space-y-4">

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-gray-400">
          <span><span className="text-white font-semibold">{categories.length}</span> categories</span>
          <span><span className="text-white font-semibold">{totalProducts}</span> products</span>
          <span><span className="text-emerald-400 font-semibold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> value</span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddInfo(true)}
            className="btn-primary"
          >
            + Add Category
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* Category list */}
        <div className="lg:w-96 shrink-0">
          <div className="card p-0">
            <div className="px-5 py-4 border-b border-surface-border">
              <h3 className="text-white font-semibold text-sm">All Categories</h3>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-gray-600 text-sm animate-pulse">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-3">
                <p className="text-sm">No categories yet</p>
                {canManage && (
                  <button onClick={() => setShowAddInfo(true)} className="text-brand-400 hover:text-brand-300 text-sm">
                    + Add your first category →
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {categories.map(cat => (
                  <div
                    key={cat._id}
                    onClick={() => setSelected(cat._id === selected ? null : cat._id)}
                    className={`flex items-center px-5 py-3.5 cursor-pointer transition-colors group ${
                      selected === cat._id ? 'bg-brand-600/15 border-l-2 border-brand-500' : 'hover:bg-surface-2'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl select-none shrink-0">📦</span>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{cat._id}</p>
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                          <span>{cat.productCount} products</span>
                          <span>·</span>
                          <span>{cat.totalStock} units</span>
                          {cat.lowStockCount > 0 && <span className="text-amber-400">⚠ {cat.lowStockCount} low</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-emerald-400 text-sm font-semibold">
                        ${cat.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); setRenaming(cat._id); setNewName(cat._id); }}
                            className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 flex items-center justify-center text-xs transition-colors"
                            title="Rename"
                          >✎</button>
                          {canDelete && (
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDelete(cat._id); }}
                              className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-red-600/20 text-gray-400 hover:text-red-400 flex items-center justify-center text-xs transition-colors"
                              title="Delete"
                            >✕</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Products panel */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="card flex items-center justify-center h-64 text-gray-600">
              <div className="text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-sm">Click a category to view its products</p>
              </div>
            </div>
          ) : (
            <div className="card p-0">
              <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">
                  {selected}
                  <span className="text-gray-500 font-normal ml-2">· {products.length} products</span>
                </h3>
                {canManage && (
                  <button
                    onClick={() => navigate('/products')}
                    className="text-brand-400 hover:text-brand-300 text-xs"
                  >
                    Manage Products →
                  </button>
                )}
              </div>
              {products.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No products in this category</div>
              ) : (
                <div className="divide-y divide-surface-border">
                  {products.map(p => (
                    <div key={p._id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2/40">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                          <span className="font-mono text-brand-400">{p.productId}</span>
                          {p.supplier?.name && <span>{p.supplier.name}</span>}
                          <span>reorder at {p.reorderLevel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-3 text-right">
                        <div>
                          <p className="text-white font-semibold text-sm">${p.unitPrice.toFixed(2)}</p>
                          <p className="text-gray-600 text-xs">unit price</p>
                        </div>
                        <span className={`${p.stock === 0 ? 'badge-danger' : p.stock <= p.reorderLevel ? 'badge-warning' : 'badge-success'}`}>
                          {p.stock} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Add Category" info modal — categories are created when products are added */}
      <Modal isOpen={showAddInfo} onClose={() => setShowAddInfo(false)} title="Add New Category" size="sm">
        <div className="space-y-4">
          <div className="bg-brand-600/10 border border-brand-600/20 rounded-xl p-4 text-sm text-gray-300 space-y-2">
            <p>Categories are created automatically when you add a product with a new category name.</p>
            <p>To create a new category, go to <strong className="text-white">Products → Add Product</strong> and type a new category name in the Category field.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddInfo(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => { setShowAddInfo(false); navigate('/products'); }}
              className="btn-primary"
            >
              Go to Products →
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={!!renaming} onClose={() => { setRenaming(null); setNewName(''); }} title={`Rename "${renaming}"`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">New Category Name</label>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newName.trim() && renameMutation.mutate({ name: renaming, newName })}
              autoFocus
            />
            <p className="text-gray-500 text-xs mt-1">Renames the category on all {categories.find(c => c._id === renaming)?.productCount || ''} products.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setRenaming(null); setNewName(''); }} className="btn-secondary">Cancel</button>
            <button
              onClick={() => renameMutation.mutate({ name: renaming, newName })}
              disabled={!newName.trim() || newName.trim() === renaming || renameMutation.isPending}
              className="btn-primary"
            >
              {renameMutation.isPending ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Category" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
            <p className="text-red-400 font-medium mb-2">⚠ This will deactivate all products</p>
            <p className="text-gray-400">
              All <strong className="text-white">{categories.find(c => c._id === confirmDelete)?.productCount || ''} products</strong> in <strong className="text-white">"{confirmDelete}"</strong> will be deactivated and hidden from sales.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => deleteMutation.mutate(confirmDelete)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
