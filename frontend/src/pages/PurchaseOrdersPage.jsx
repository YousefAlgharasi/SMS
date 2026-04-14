import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poAPI, suppliersAPI, productsAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  draft: 'badge-warning',
  sent: 'badge-info',
  partially_received: 'badge-warning',
  received: 'badge-success',
  cancelled: 'badge-danger',
};

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [showReceive, setShowReceive]   = useState(null); // PO object
  const [showDetail, setShowDetail]     = useState(null); // PO object for read-only view
  const [supplier, setSupplier]         = useState('');
  const [poItems, setPoItems]           = useState([{ product: '', quantity: 1, unitCost: 0 }]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [receiveQtys, setReceiveQtys]   = useState({}); // productId → qty

  const { data, isLoading } = useQuery({
    queryKey: ['pos', page, filterStatus],
    queryFn: () => poAPI.getAll({ page, limit: 20, status: filterStatus }),
    keepPreviousData: true,
  });
  const { data: suppData } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersAPI.getAll({ limit: 100 }) });
  const { data: prodData } = useQuery({ queryKey: ['products-all'], queryFn: () => productsAPI.getAll({ limit: 200 }) });
  const suppliers = suppData?.data || [];
  const products  = prodData?.data || [];

  const createMutation = useMutation({
    mutationFn: poAPI.create,
    onSuccess: () => {
      toast.success('Purchase Order created!');
      qc.invalidateQueries(['pos']);
      setShowCreate(false); setPoItems([{ product: '', quantity: 1, unitCost: 0 }]); setSupplier(''); setExpectedDelivery('');
    },
    onError: e => toast.error(e.message),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, data }) => poAPI.receive(id, data),
    onSuccess: (res) => {
      toast.success(res.message || 'Stock received!');
      qc.invalidateQueries(['pos']); qc.invalidateQueries(['products']); qc.invalidateQueries(['inventory-overview']);
      setShowReceive(null); setReceiveQtys({});
    },
    onError: e => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => poAPI.updateStatus(id, { status }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'cancelled' ? 'Order cancelled' : 'Status updated');
      qc.invalidateQueries(['pos']);
    },
    onError: e => toast.error(e.message),
  });

  const openReceive = (po) => {
    const qtys = {};
    po.items.forEach(item => {
      const remaining = item.quantity - (item.receivedQuantity || 0);
      qtys[item.product._id || item.product] = remaining;
    });
    setReceiveQtys(qtys);
    setShowReceive(po);
  };

  const addPoItem    = () => setPoItems(p => [...p, { product: '', quantity: 1, unitCost: 0 }]);
  const removePoItem = (i) => setPoItems(p => p.filter((_, idx) => idx !== i));
  const updatePoItem = (i, field, val) => setPoItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const poTotal = poItems.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitCost)), 0);

  const columns = [
    { key: 'poNumber',    label: 'PO #',     render: v => <span className="font-mono text-brand-400 text-xs">{v}</span> },
    { key: 'supplier',   label: 'Supplier',  render: v => <span className="text-white">{v?.name}</span> },
    { key: 'totalAmount',label: 'Amount',    render: v => <span className="text-white font-semibold">${v?.toFixed(2)}</span> },
    { key: 'status',     label: 'Status',    render: v => <span className={STATUS_BADGE[v] || 'badge-info'}>{v?.replace('_', ' ')}</span> },
    { key: 'expectedDelivery', label: 'Expected', render: v => <span className="text-gray-400 text-xs">{v ? new Date(v).toLocaleDateString() : '—'}</span> },
    { key: '_id',        label: 'Actions',   render: (_, r) => (
      <div className="flex gap-2 items-center">
        <button onClick={() => setShowDetail(r)} className="text-gray-400 hover:text-white text-xs">View</button>
        {!['received','cancelled'].includes(r.status) && (
          <button onClick={() => openReceive(r)} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium">
            ✓ Receive
          </button>
        )}
        {r.status === 'draft' && (
          <button onClick={() => statusMutation.mutate({ id: r._id, status: 'sent' })} className="text-brand-400 hover:text-brand-300 text-xs">
            → Send
          </button>
        )}
        {!['received','cancelled'].includes(r.status) && (
          <button onClick={() => statusMutation.mutate({ id: r._id, status: 'cancelled' })} className="text-red-400 hover:text-red-300 text-xs">
            Cancel
          </button>
        )}
      </div>
    )},
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-brand-400 text-xs">{row.poNumber}</span>
        <span className={STATUS_BADGE[row.status] || 'badge-info'}>{row.status?.replace('_', ' ')}</span>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white text-sm font-medium">{row.supplier?.name}</p>
          <p className="text-gray-500 text-xs">{row.expectedDelivery ? new Date(row.expectedDelivery).toLocaleDateString() : 'No date'}</p>
        </div>
        <p className="text-white font-bold">${row.totalAmount?.toFixed(2)}</p>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={() => setShowDetail(row)} className="text-gray-400 text-xs hover:text-white">View</button>
        {!['received','cancelled'].includes(row.status) && (
          <button onClick={() => openReceive(row)} className="text-emerald-400 text-xs font-medium hover:text-emerald-300">✓ Receive</button>
        )}
        {row.status === 'draft' && (
          <button onClick={() => statusMutation.mutate({ id: row._id, status: 'sent' })} className="text-brand-400 text-xs hover:text-brand-300">→ Send</button>
        )}
        {!['received','cancelled'].includes(row.status) && (
          <button onClick={() => statusMutation.mutate({ id: row._id, status: 'cancelled' })} className="text-red-400 text-xs hover:text-red-300">Cancel</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <select className="input w-full sm:w-40" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_received">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto">+ New PO</button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} emptyMessage="No purchase orders found" />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      {/* Create PO Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier *</label>
              <select className="input" value={supplier} onChange={e => setSupplier(e.target.value)}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Delivery</label>
              <input type="date" className="input" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Items</label>
              <button type="button" onClick={addPoItem} className="text-brand-400 text-xs hover:text-brand-300">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {poItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input flex-1 text-sm" value={item.product} onChange={e => updatePoItem(i, 'product', e.target.value)}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (stock: {p.stock})</option>)}
                  </select>
                  <input type="number" className="input w-20 text-sm" placeholder="Qty" min="1" value={item.quantity} onChange={e => updatePoItem(i, 'quantity', e.target.value)} inputMode="numeric" />
                  <input type="number" className="input w-24 text-sm" placeholder="Unit $" min="0" step="0.01" value={item.unitCost} onChange={e => updatePoItem(i, 'unitCost', e.target.value)} inputMode="decimal" />
                  <button onClick={() => removePoItem(i)} className="text-gray-600 hover:text-red-400 text-xl w-6 text-center">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-border flex-wrap gap-3">
            <span className="text-white font-bold text-lg">Total: ${poTotal.toFixed(2)}</span>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => createMutation.mutate({ supplier, items: poItems.filter(i => i.product), expectedDelivery: expectedDelivery || undefined })}
                disabled={!supplier || poItems.every(i => !i.product) || createMutation.isPending}
                className="btn-primary"
              >{createMutation.isPending ? 'Creating...' : 'Create PO'}</button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Receive Order Modal */}
      <Modal isOpen={!!showReceive} onClose={() => { setShowReceive(null); setReceiveQtys({}); }} title={`Receive Order — ${showReceive?.poNumber}`} size="lg">
        {showReceive && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-lg p-3 text-sm flex gap-4 flex-wrap">
              <div><span className="text-gray-400">Supplier: </span><span className="text-white">{showReceive.supplier?.name}</span></div>
              <div><span className="text-gray-400">Status: </span><span className={STATUS_BADGE[showReceive.status]}>{showReceive.status}</span></div>
            </div>

            <div>
              <p className="label mb-2">Items to Receive</p>
              <p className="text-gray-500 text-xs mb-3">Set the quantity actually received for each item. Received stock will be added to inventory immediately.</p>
              <div className="space-y-3">
                {showReceive.items?.map((item) => {
                  const productId = item.product?._id || item.product;
                  const remaining = item.quantity - (item.receivedQuantity || 0);
                  return (
                    <div key={productId} className="flex items-center gap-3 bg-surface-2 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{item.productName}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                          <span>Ordered: {item.quantity}</span>
                          {item.receivedQuantity > 0 && <span className="text-emerald-400">Already got: {item.receivedQuantity}</span>}
                          <span>Remaining: {remaining}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <label className="label text-xs mb-1">Receiving now</label>
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          className="input w-20 text-center"
                          value={receiveQtys[productId] ?? remaining}
                          onChange={e => setReceiveQtys(q => ({ ...q, [productId]: Number(e.target.value) }))}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-surface-border">
              <button onClick={() => { setShowReceive(null); setReceiveQtys({}); }} className="btn-secondary">Cancel</button>
              <button
                onClick={() => receiveMutation.mutate({
                  id: showReceive._id,
                  data: {
                    receivedItems: showReceive.items
                      .filter(item => {
                        const pid = item.product?._id || item.product;
                        return (receiveQtys[pid] ?? 0) > 0;
                      })
                      .map(item => {
                        const pid = item.product?._id || item.product;
                        return { productId: pid, quantity: receiveQtys[pid] ?? 0 };
                      })
                  }
                })}
                disabled={receiveMutation.isPending}
                className="btn-primary"
              >
                {receiveMutation.isPending ? 'Updating stock...' : '✓ Confirm Receipt & Add to Stock'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail / View Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={`PO — ${showDetail?.poNumber}`} size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="label">Supplier</span><p className="text-white">{showDetail.supplier?.name}</p></div>
              <div><span className="label">Status</span><span className={STATUS_BADGE[showDetail.status]}>{showDetail.status?.replace('_',' ')}</span></div>
              <div><span className="label">Created By</span><p className="text-white">{showDetail.createdBy?.name}</p></div>
              <div><span className="label">Expected</span><p className="text-white">{showDetail.expectedDelivery ? new Date(showDetail.expectedDelivery).toLocaleDateString() : '—'}</p></div>
              {showDetail.receivedDate && <div><span className="label">Received</span><p className="text-white">{new Date(showDetail.receivedDate).toLocaleDateString()}</p></div>}
              <div><span className="label">Total</span><p className="text-white font-bold">${showDetail.totalAmount?.toFixed(2)}</p></div>
            </div>
            <div>
              <p className="label mb-2">Items</p>
              <div className="divide-y divide-surface-border border border-surface-border rounded-lg overflow-hidden">
                {showDetail.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-white text-sm">{item.productName}</p>
                      <p className="text-gray-500 text-xs">${item.unitCost?.toFixed(2)} / unit</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">{item.quantity} ordered</p>
                      {item.receivedQuantity > 0 && <p className="text-emerald-400 text-xs">{item.receivedQuantity} received</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
