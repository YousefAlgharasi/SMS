import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsAPI, customersAPI, salesAPI } from '../services/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'cash',           label: 'Cash',    icon: '💵' },
  { id: 'card',           label: 'Card',    icon: '💳' },
  { id: 'digital_wallet', label: 'eWallet', icon: '📱' },
  { id: 'wallet_balance', label: 'Balance', icon: '🏦' },
  { id: 'custom',         label: 'Other',   icon: '✎'  },
];

export default function NewSalePage() {
  const navigate = useNavigate();

  const [cartItems,        setCartItems]        = useState([]);
  const [customerId,       setCustomerId]        = useState('');
  const [customerObj,      setCustomerObj]       = useState(null); // full customer for wallet display
  const [paymentMethod,    setPaymentMethod]     = useState('cash');
  const [cashReceived,     setCashReceived]      = useState('');
  const [discountAmount,   setDiscountAmount]    = useState('');
  const [search,           setSearch]            = useState('');
  const [customerSearch,   setCustomerSearch]    = useState('');
  const [showCart,         setShowCart]          = useState(false);
  const [customMethodName, setCustomMethodName]  = useState('');
  const [customPayerName,  setCustomPayerName]   = useState('');
  const [customPayerPhone, setCustomPayerPhone]  = useState('');
  const [customTransRef,   setCustomTransRef]    = useState('');
  const [customNote,       setCustomNote]        = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-pos', search],
    queryFn: () => productsAPI.getAll({ search, limit: 30, isActive: true }),
    keepPreviousData: true,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-pos', customerSearch],
    queryFn: () => customersAPI.getAll({ search: customerSearch, limit: 6 }),
    enabled: customerSearch.length > 1,
  });

  const createSaleMutation = useMutation({
    mutationFn: salesAPI.create,
    onSuccess: (res) => { toast.success('Sale completed!'); navigate(`/sales/${res.data._id}`); },
    onError:   (err) => toast.error(err.message || 'Failed to process sale'),
  });

  const products  = productsData?.data  || [];
  const customers = customersData?.data || [];

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const addToCart = (product) => {
    if (product.stock === 0) { toast.error('Out of stock'); return; }
    setCartItems(prev => {
      const existing = prev.find(i => i.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Not enough stock'); return prev; }
        return prev.map(i => i.product === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product: product._id, productName: product.name, unitPrice: product.unitPrice, discount: product.discount || 0, taxRate: product.taxRate || 0, quantity: 1, stock: product.stock, _qtyRaw: undefined }];
    });
  };

  const removeItem = (pid) => setCartItems(prev => prev.filter(i => i.product !== pid));

  const updateQty = (pid, rawVal) => {
    if (rawVal === '' || rawVal === '-') {
      setCartItems(prev => prev.map(i => i.product === pid ? { ...i, _qtyRaw: rawVal } : i));
      return;
    }
    const qty = parseInt(rawVal, 10);
    if (isNaN(qty) || qty < 1) { removeItem(pid); return; }
    setCartItems(prev => prev.map(i => {
      if (i.product !== pid) return i;
      if (qty > i.stock) { toast.error('Not enough stock'); return i; }
      return { ...i, quantity: qty, _qtyRaw: undefined };
    }));
  };

  const commitQty = (pid) => {
    setCartItems(prev => prev.map(i => {
      if (i.product !== pid || i._qtyRaw === undefined) return i;
      const qty = parseInt(i._qtyRaw, 10);
      if (isNaN(qty) || qty < 1) return { ...i, quantity: 1, _qtyRaw: undefined };
      return { ...i, quantity: Math.min(qty, i.stock), _qtyRaw: undefined };
    }));
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const subtotal  = cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxAmount = cartItems.reduce((s, i) => {
    const base = i.unitPrice * i.quantity * (1 - i.discount / 100);
    return s + base * (i.taxRate / 100);
  }, 0);
  const discount = parseFloat(discountAmount) || 0;
  const total    = Math.max(0, subtotal + taxAmount - discount);
  const change   = paymentMethod === 'cash' ? Math.max(0, (parseFloat(cashReceived) || 0) - total) : 0;
  const walletShort = paymentMethod === 'wallet_balance' && customerObj
    ? Math.max(0, total - (customerObj.walletBalance || 0))
    : 0;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!cartItems.length) { toast.error('Cart is empty'); return; }
    if (paymentMethod === 'cash' && (parseFloat(cashReceived) || 0) < total) {
      toast.error('Cash received is less than total'); return;
    }
    if (paymentMethod === 'wallet_balance') {
      if (!customerId) { toast.error('Select a customer to pay with wallet balance'); return; }
      if (walletShort > 0) { toast.error(`Insufficient wallet balance — short by $${walletShort.toFixed(2)}`); return; }
    }
    if (paymentMethod === 'custom' && !customMethodName.trim()) {
      toast.error('Please enter a payment method name'); return;
    }

    const paymentDetails = {};
    if (paymentMethod === 'cash')   { paymentDetails.cashReceived = parseFloat(cashReceived); paymentDetails.changeReturned = change; }
    if (paymentMethod === 'custom') { paymentDetails.customMethodName = customMethodName.trim(); paymentDetails.customPayerName = customPayerName.trim(); paymentDetails.customPayerPhone = customPayerPhone.trim(); paymentDetails.transactionRef = customTransRef.trim(); paymentDetails.customNote = customNote.trim(); }

    createSaleMutation.mutate({
      items: cartItems.map(i => ({ product: i.product, quantity: i.quantity, discount: i.discount })),
      customer: customerId || undefined,
      paymentMethod,
      paymentDetails,
      discountAmount: discount,
    });
  };

  // ── Shared JSX blocks (inlined, not components, to avoid remount bug) ───

  // Customer section
  const customerSection = (
    <div className="card shrink-0">
      <label className="label">Customer (optional)</label>
      <input
        className="input"
        placeholder="Search by name, phone..."
        value={customerSearch}
        onChange={e => {
          setCustomerSearch(e.target.value);
          if (!e.target.value) { setCustomerId(''); setCustomerObj(null); }
        }}
      />
      {customers.length > 0 && customerSearch && !customerId && (
        <div className="mt-2 border border-surface-border rounded-lg overflow-hidden">
          {customers.map(c => (
            <button
              key={c._id}
              onClick={() => { setCustomerId(c._id); setCustomerObj(c); setCustomerSearch(`${c.firstName} ${c.lastName}`); }}
              className="w-full text-left px-3 py-2.5 hover:bg-surface-2 border-b border-surface-border last:border-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">{c.firstName} {c.lastName}</span>
                  <span className="text-gray-500 ml-2 text-xs">{c.phone || c.customerId}</span>
                </div>
                {(c.walletBalance || 0) > 0 && (
                  <span className="text-brand-400 text-xs font-medium">💳 ${c.walletBalance.toFixed(2)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Show wallet balance after customer selected */}
      {customerObj && (
        <div className="mt-2 flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
          <span className="text-gray-400 text-xs">Wallet Balance</span>
          <span className={`font-semibold text-sm ${(customerObj.walletBalance || 0) > 0 ? 'text-brand-400' : 'text-gray-600'}`}>
            💳 ${(customerObj.walletBalance || 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );

  // Cart items section
  const cartSection = (
    <div className="card shrink-0">
      <div className="flex items-center justify-between mb-3">
        <p className="label mb-0">Cart</p>
        {cartItems.length > 0 && (
          <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-0.5">
            {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {cartItems.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">Tap products to add them</p>
      ) : (
        <div className="space-y-2 overflow-y-auto" style={{ minHeight: '88px', maxHeight: '260px' }}>
          {cartItems.map(item => (
            <div key={item.product} className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{item.productName}</p>
                <p className="text-gray-400 text-xs">${item.unitPrice.toFixed(2)} ea</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(item.product, item.quantity - 1)} className="w-6 h-6 rounded bg-surface-3 text-gray-300 flex items-center justify-center hover:bg-surface-border text-sm">−</button>
                <input
                  type="number" min="1" max={item.stock}
                  value={item._qtyRaw !== undefined ? item._qtyRaw : item.quantity}
                  onChange={e => updateQty(item.product, e.target.value)}
                  onBlur={() => commitQty(item.product)}
                  className="w-10 h-6 text-center text-white text-xs bg-surface-card border border-surface-border rounded focus:outline-none focus:border-brand-500"
                  inputMode="numeric"
                />
                <button onClick={() => updateQty(item.product, item.quantity + 1)} className="w-6 h-6 rounded bg-surface-3 text-gray-300 flex items-center justify-center hover:bg-surface-border text-sm">+</button>
              </div>
              <span className="text-brand-400 text-xs font-bold w-14 text-right shrink-0">${(item.unitPrice * item.quantity).toFixed(2)}</span>
              <button onClick={() => removeItem(item.product)} className="text-gray-600 hover:text-red-400 transition-colors text-base leading-none ml-1">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Payment section
  const paymentSection = (
    <div className="card space-y-3 shrink-0">
      {/* Method buttons */}
      <div>
        <label className="label">Payment Method</label>
        <div className="grid grid-cols-5 gap-1.5">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              disabled={m.id === 'wallet_balance' && !customerId}
              className={`py-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-0.5 disabled:opacity-30 disabled:cursor-not-allowed ${
                paymentMethod === m.id
                  ? 'bg-brand-600/25 border-brand-500 text-brand-300'
                  : 'border-surface-border text-gray-400 hover:border-gray-500'
              }`}
              title={m.id === 'wallet_balance' && !customerId ? 'Select a customer first' : ''}
            >
              <span className="text-base">{m.icon}</span>
              <span className="leading-tight text-center">{m.label}</span>
            </button>
          ))}
        </div>
        {paymentMethod === 'wallet_balance' && !customerId && (
          <p className="text-amber-400 text-xs mt-1">↑ Select a customer above to use their wallet</p>
        )}
      </div>

      {/* Cash fields */}
      {paymentMethod === 'cash' && (
        <div>
          <label className="label">Cash Received</label>
          <input type="number" className="input" placeholder="0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} inputMode="decimal" min="0" step="0.01" />
          {cashReceived && (
            <p className={`text-xs mt-1 font-medium ${(parseFloat(cashReceived)||0) >= total ? 'text-emerald-400' : 'text-red-400'}`}>
              {(parseFloat(cashReceived)||0) >= total ? `Change: $${change.toFixed(2)}` : `Short by: $${(total-(parseFloat(cashReceived)||0)).toFixed(2)}`}
            </p>
          )}
        </div>
      )}

      {/* Wallet balance info */}
      {paymentMethod === 'wallet_balance' && customerObj && (
        <div className={`rounded-lg p-3 text-sm border ${walletShort > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-brand-600/10 border-brand-600/20'}`}>
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">Wallet Balance</span>
            <span className="text-brand-400 font-semibold">${(customerObj.walletBalance || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Sale Total</span>
            <span className="text-white font-semibold">${total.toFixed(2)}</span>
          </div>
          {walletShort > 0
            ? <p className="text-red-400 text-xs mt-2 font-medium">⚠ Insufficient — short by ${walletShort.toFixed(2)}</p>
            : <p className="text-emerald-400 text-xs mt-2 font-medium">✓ Balance after: ${((customerObj.walletBalance||0) - total).toFixed(2)}</p>
          }
        </div>
      )}

      {/* Custom payment fields */}
      {paymentMethod === 'custom' && (
        <div className="space-y-2 border border-brand-600/20 rounded-lg p-3 bg-brand-600/5">
          <p className="text-brand-400 text-xs font-medium uppercase tracking-wide">Custom Payment</p>
          <div><label className="label">Method Name *</label><input className="input" placeholder="Bank Transfer, Cheque, PayPal..." value={customMethodName} onChange={e => setCustomMethodName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Payer Name</label><input className="input" placeholder="Full name" value={customPayerName} onChange={e => setCustomPayerName(e.target.value)} /></div>
            <div><label className="label">Phone</label><input className="input" placeholder="+1 555..." value={customPayerPhone} onChange={e => setCustomPayerPhone(e.target.value)} inputMode="tel" /></div>
          </div>
          <div><label className="label">Reference / Transaction #</label><input className="input" placeholder="Cheque #, confirmation..." value={customTransRef} onChange={e => setCustomTransRef(e.target.value)} /></div>
          <div><label className="label">Note</label><input className="input" placeholder="Any additional info..." value={customNote} onChange={e => setCustomNote(e.target.value)} /></div>
        </div>
      )}

      {/* Discount */}
      <div>
        <label className="label">Discount ($)</label>
        <input type="number" className="input" value={discountAmount} placeholder="0.00" min="0" step="0.01" onChange={e => setDiscountAmount(e.target.value)} inputMode="decimal" />
      </div>

      {/* Totals */}
      <div className="border-t border-surface-border pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
        {taxAmount > 0 && <div className="flex justify-between text-gray-400"><span>Tax</span><span>${taxAmount.toFixed(2)}</span></div>}
        {discount > 0 && <div className="flex justify-between text-emerald-400"><span>Discount</span><span>−${discount.toFixed(2)}</span></div>}
        <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-surface-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={cartItems.length === 0 || createSaleMutation.isPending || (paymentMethod === 'wallet_balance' && walletShort > 0)}
        className="btn-primary w-full justify-center py-3 text-base font-semibold"
      >
        {createSaleMutation.isPending ? 'Processing...' : `Complete Sale · $${total.toFixed(2)}`}
      </button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* DESKTOP */}
      <div className="hidden lg:flex gap-6 h-[calc(100vh-9rem)]">
        {/* Left: products */}
        <div className="flex-1 flex flex-col min-w-0">
          <input className="input mb-4 shrink-0" placeholder="Search products by name, barcode, SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 content-start">
              {products.map(p => (
                <button key={p._id} onClick={() => addToCart(p)} disabled={p.stock === 0}
                  className="card text-left hover:border-brand-600/50 active:scale-95 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-600 font-mono truncate pr-1">{p.productId}</span>
                    <span className={`shrink-0 ${p.stock === 0 ? 'badge-danger' : p.stock <= p.reorderLevel ? 'badge-warning' : 'badge-success'}`}>{p.stock}</span>
                  </div>
                  <p className="text-white font-medium text-sm mb-1 group-hover:text-brand-300 transition-colors leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-500 mb-2 truncate">{p.category}</p>
                  <p className="text-brand-400 font-bold">${p.unitPrice.toFixed(2)}</p>
                </button>
              ))}
              {!products.length && <div className="col-span-3 flex items-center justify-center h-40 text-gray-600 text-sm">No products found</div>}
            </div>
          </div>
        </div>
        {/* Right: cart */}
        <div className="w-80 xl:w-96 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {customerSection}
          {cartSection}
          {paymentSection}
        </div>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex bg-surface-2 rounded-xl p-1 mb-4 shrink-0">
          <button onClick={() => setShowCart(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!showCart ? 'bg-surface-card text-white shadow' : 'text-gray-400'}`}>Products</button>
          <button onClick={() => setShowCart(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${showCart ? 'bg-surface-card text-white shadow' : 'text-gray-400'}`}>
            Cart
            {cartItems.length > 0 && <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center leading-none">{cartItems.length}</span>}
          </button>
        </div>

        {!showCart && (
          <div className="flex-1 flex flex-col min-h-0">
            <input className="input mb-3 shrink-0" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 content-start">
                {products.map(p => (
                  <button key={p._id} onClick={() => addToCart(p)} disabled={p.stock === 0}
                    className="card text-left hover:border-brand-600/50 active:scale-95 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="flex justify-end mb-1">
                      <span className={`${p.stock === 0 ? 'badge-danger' : p.stock <= p.reorderLevel ? 'badge-warning' : 'badge-success'}`}>{p.stock}</span>
                    </div>
                    <p className="text-white font-medium text-xs mb-1 group-hover:text-brand-300 leading-tight">{p.name}</p>
                    <p className="text-brand-400 font-bold text-sm">${p.unitPrice.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showCart && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {customerSection}
            {cartSection}
            {paymentSection}
          </div>
        )}
      </div>
    </>
  );
}
