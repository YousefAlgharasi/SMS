import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnsAPI, salesAPI } from '../services/api';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const STATUS_BADGE = { completed: 'badge-success', pending: 'badge-warning', refunded: 'badge-danger', partially_refunded: 'badge-warning' };

// ── Receipt Search with live dropdown ────────────────────────────────────────
function ReceiptSearch({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(null); // confirmed receipt
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live search — fires whenever query changes, debounced 300ms
  useEffect(() => {
    if (!query.trim() || selected) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await salesAPI.getAll({ search: query.trim(), limit: 8 });
        setResults(res.data || []);
        setOpen((res.data || []).length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  const handleSelect = (sale) => {
    if (sale.status === 'refunded') { toast.error('This sale has already been fully refunded'); return; }
    setQuery(sale.receiptNumber);
    setSelected(sale);
    setOpen(false);
    onSelect(sale);
  };

  const handleClear = () => {
    setQuery('');
    setSelected(null);
    setResults([]);
    setOpen(false);
    onSelect(null);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="label">Receipt Number</label>
      <div className="relative">
        <input
          className="input pr-8"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => results.length > 0 && !selected && setOpen(true)}
          placeholder="Type receipt number, last 3 digits, or customer name..."
          autoComplete="off"
        />
        {/* Status indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading && <span className="text-gray-500 text-xs animate-pulse">…</span>}
          {selected && <button onClick={handleClear} className="text-gray-500 hover:text-white text-lg leading-none">×</button>}
        </div>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface-1 border border-surface-border rounded-xl shadow-xl overflow-hidden">
          {results.map(sale => (
            <button
              key={sale._id}
              onClick={() => handleSelect(sale)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors border-b border-surface-border last:border-0 ${sale.status === 'refunded' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-brand-400 text-sm font-medium">{sale.receiptNumber}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : sale.customerSnapshot?.name || 'Walk-in'}
                    {' · '}{new Date(sale.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-white font-semibold">${sale.total?.toFixed(2)}</p>
                  <span className={`${STATUS_BADGE[sale.status] || 'badge-info'} text-xs`}>{sale.status}</span>
                </div>
              </div>
            </button>
          ))}
          {results.length === 8 && (
            <p className="text-center text-gray-600 text-xs py-2">Showing first 8 results — type more to narrow down</p>
          )}
        </div>
      )}

      {/* No results hint */}
      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface-1 border border-surface-border rounded-xl shadow-xl px-4 py-3">
          <p className="text-gray-500 text-sm">No receipts found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [sale, setSale]               = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason]           = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page],
    queryFn: () => returnsAPI.getAll({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: returnsAPI.create,
    onSuccess: (res) => {
      const d = res.data;
      if (d?.refundMethod === 'wallet_balance') {
        toast.success(`Refund of $${d.totalRefund?.toFixed(2)} added to customer wallet!`);
      } else if (d?.voucherCode) {
        toast.success(`Return processed! Voucher: ${d.voucherCode}`);
      } else {
        toast.success(`Return processed! Refund: $${d?.totalRefund?.toFixed(2)}`);
      }
      qc.invalidateQueries(['returns']);
      qc.invalidateQueries(['customers']);
      closeModal();
    },
    onError: e => toast.error(e.message),
  });

  const closeModal = () => {
    setShowModal(false);
    setSale(null);
    setReturnItems([]);
    setRefundMethod('cash');
    setReason('');
  };

  const handleSaleSelected = (selectedSale) => {
    setSale(selectedSale);
    if (selectedSale) {
      setReturnItems(selectedSale.items?.map(i => ({
        productId:   i.product?._id || i.product,
        productName: i.productName,
        maxQty:      i.quantity,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        selected:    true,
      })) || []);
      // Default refund method — if customer exists suggest wallet, else cash
      setRefundMethod(selectedSale.customer ? 'wallet_balance' : 'cash');
    } else {
      setReturnItems([]);
    }
  };

  const totalRefund = returnItems
    .filter(i => i.selected)
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const columns = [
    { key: 'returnNumber',  label: 'Return #',  render: v => <span className="font-mono text-brand-400 text-xs">{v}</span> },
    { key: 'receiptNumber', label: 'Receipt',   render: v => <span className="font-mono text-gray-400 text-xs">{v}</span> },
    { key: 'customer',      label: 'Customer',  render: v => <span className="text-gray-300 text-sm">{v ? `${v.firstName} ${v.lastName}` : 'Walk-in'}</span> },
    { key: 'totalRefund',   label: 'Refund',    render: v => <span className="text-emerald-400 font-semibold">${v?.toFixed(2)}</span> },
    { key: 'refundMethod',  label: 'Method',    render: v => <span className="badge-info text-xs">{v?.replace(/_/g, ' ')}</span> },
    { key: 'voucherCode',   label: 'Voucher',   render: v => v ? <span className="font-mono text-amber-400 text-xs">{v}</span> : <span className="text-gray-600">—</span> },
    { key: 'createdAt',     label: 'Date',      render: v => <span className="text-gray-500 text-xs">{new Date(v).toLocaleDateString()}</span> },
  ];

  const mobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-brand-400 text-xs">{row.returnNumber}</span>
        <span className="text-emerald-400 font-bold">${row.totalRefund?.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm">{row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : 'Walk-in'}</p>
          <p className="text-gray-500 text-xs font-mono">{row.receiptNumber}</p>
        </div>
        <div className="text-right">
          <span className="badge-info text-xs">{row.refundMethod?.replace(/_/g,' ')}</span>
          {row.voucherCode && <p className="font-mono text-amber-400 text-xs mt-0.5">{row.voucherCode}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-semibold">Returns & Refunds</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary">↩ Process Return</button>
      </div>

      <div className="card p-0">
        <Table columns={columns} data={data?.data} loading={isLoading} mobileCard={mobileCard} />
        {data?.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title="Process Return" size="lg">
        <div className="space-y-4">

          {/* Live receipt search */}
          <ReceiptSearch onSelect={handleSaleSelected} />

          {/* Sale summary */}
          {sale && (
            <>
              <div className="bg-surface-2 rounded-xl p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><span className="label text-xs">Total</span><p className="text-white font-semibold">${sale.total?.toFixed(2)}</p></div>
                <div><span className="label text-xs">Payment</span><p className="text-white capitalize">{sale.paymentMethod?.replace(/_/g,' ')}</p></div>
                <div><span className="label text-xs">Date</span><p className="text-white">{new Date(sale.createdAt).toLocaleDateString()}</p></div>
                <div><span className="label text-xs">Customer</span><p className="text-white truncate">{sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Walk-in'}</p></div>
              </div>

              {/* Items */}
              <div>
                <label className="label">Items to Return</label>
                <div className="space-y-2">
                  {returnItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={e => setReturnItems(r => r.map((ri, idx) => idx === i ? { ...ri, selected: e.target.checked } : ri))}
                        className="accent-brand-500 shrink-0 w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.productName}</p>
                        <p className="text-gray-500 text-xs">${item.unitPrice?.toFixed(2)} each · max {item.maxQty}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          className="input w-16 text-xs py-1 text-center"
                          min="1" max={item.maxQty}
                          value={item.quantity}
                          disabled={!item.selected}
                          onChange={e => setReturnItems(r => r.map((ri, idx) => idx === i ? { ...ri, quantity: Math.min(Number(e.target.value), ri.maxQty) } : ri))}
                          inputMode="numeric"
                        />
                      </div>
                      <span className="text-emerald-400 text-xs font-semibold w-16 text-right shrink-0">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Refund Method</label>
                  <select className="input" value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="original_payment">Original Payment Method</option>
                    <option value="store_credit">Store Credit Voucher</option>
                    {sale.customer && (
                      <option value="wallet_balance">Add to Customer Wallet 💳</option>
                    )}
                  </select>
                  {refundMethod === 'wallet_balance' && (
                    <p className="text-brand-400 text-xs mt-1">
                      💳 ${totalRefund.toFixed(2)} will be added to {sale.customer?.firstName}'s wallet
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Defective, wrong item, changed mind..." />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-border gap-3 flex-wrap">
                <div>
                  <span className="text-gray-400 text-sm">Refund Amount: </span>
                  <span className="text-white font-bold text-xl">${totalRefund.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => createMutation.mutate({
                    receiptNumber: sale.receiptNumber,
                    items: returnItems.filter(i => i.selected).map(i => ({ productId: i.productId, quantity: i.quantity })),
                    refundMethod,
                    reason,
                  })}
                  disabled={returnItems.filter(i => i.selected).length === 0 || createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Processing...' : '✓ Process Return'}
                </button>
              </div>
            </>
          )}

          {/* Hint when no sale selected yet */}
          {!sale && (
            <div className="bg-surface-2 rounded-xl p-6 text-center text-gray-500">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">Search for a receipt by number, last few digits, or customer name</p>
              <p className="text-xs mt-1 text-gray-600">e.g. type "001" to find RCP-202401-00001</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
